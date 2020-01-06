const express = require("express");
const noop = require("express-noop");
const bodyParser = require("body-parser");
const cors = require("cors");
const basicauth = require("basicauth-middleware");
const jwt = require("jsonwebtoken");
const jwtExpress = require("express-jwt");
const scrypt = require("scrypt");
const trace = require("debug")("trace");
const info = require("debug")("info");
const error = require("debug")("error");
const MongoClient = require("mongodb").MongoClient;
var Mutex = require("async-mutex").Mutex;

(async () => {
  const mongo = await MongoClient.connect(
    process.env.MONGODB_URI || "mongodb://db:27017/ekofe"
  );
  const db = mongo.db();

  // ensure indices
  await db.collection("data").createIndex("username");

  const seed = process.env.SEED;

  const app = express();
  const expressWs = require("express-ws")(app);
  app.use(bodyParser.json({ type: "application/json", limit: "2mb" }));
  app.use(cors());

  const clients = {};

  const locks = {};

  const scryptParams = scrypt.paramsSync(0.2);

  app.post(
    "/token",
    process.env.PASSWORD ? basicauth("user", process.env.PASSWORD) : noop(),
    (req, res) => {
      const { username, password } = req.body;

      db.collection("data")
        .findOne({ username })
        .then(user => {
          if (user) {
            return scrypt
              .verifyKdf(new Buffer(user.kdf, "base64"), password)
              .then(result => {
                if (result) {
                  res.json(
                    jwt.sign({ username: username }, process.env.SECRET)
                  );
                } else {
                  res.send(401);
                }
              });
          } else {
            return scrypt
              .kdf(password, scryptParams)
              .then(kdf =>
                db.collection("data").insertOne({
                  username,
                  kdf: kdf.toString("base64"),
                  actions: []
                })
              )
              .then(() =>
                res.json(jwt.sign({ username: username }, process.env.SECRET))
              );
          }
        })
        .catch(err => {
          error(err);
          res.status(500).end(err);
        });
    }
  );

  app.post(
    "/api",
    jwtExpress({ secret: process.env.SECRET }),
    async (req, res) => {
      const { startFrom, actions, snapshot, version } = req.body;
      if (!locks[req.user.username]) {
        locks[req.user.username] = new Mutex();
      }

      await locks[req.user.username].runExclusive(async () => {
        try {
          const data = await db.collection("data").findOne(
            { username: req.user.username },
            {
              projection: {
                actions: { $slice: [startFrom, Math.pow(2, 30)] },
                snapshot: 1
              }
            }
          );
          const actionCount = startFrom + data.actions.length;
          const storedSnapshot = data.snapshot || {};

          if (actions.length > 0) {
            await db.collection("data").updateOne(
              { username: req.user.username },
              {
                $push: {
                  actions: { $each: actions.map(action => String(action)) }
                }
              }
            );
          }

          const newActions = data.actions.concat(actions);

          const sequence = actionCount;
          let storedSnapshotSequence = storedSnapshot.sequence
            ? parseInt(storedSnapshot.sequence)
            : 0;
          let storedSnapshotVersion = storedSnapshot.version
            ? parseInt(storedSnapshot.version)
            : undefined;
          trace(storedSnapshotSequence);
          trace(storedSnapshotVersion);
          trace(sequence);
          trace(newActions);
          if (snapshot) {
            info(`Trying to store snapshot`);
            if (
              (storedSnapshotVersion === undefined ||
                version >= storedSnapshotVersion) &&
              startFrom === sequence
            ) {
              info(`Storing snapshot`);
              const snapshotSequence = sequence + actions.length;
              await db.collection("data").findOneAndUpdate(
                { username: req.user.username },
                {
                  $set: {
                    snapshot: {
                      version,
                      snapshot,
                      sequence: snapshotSequence
                    }
                  }
                }
              );
              storedSnapshotSequence = snapshotSequence;
              storedSnapshotVersion = version;
            }
          }
          const baseAnswer = {
            snapshotSequence:
              version === storedSnapshotVersion ? storedSnapshotSequence : 0,
            seed
          };

          if (startFrom < sequence) {
            if (
              !snapshot &&
              version === storedSnapshotVersion &&
              storedSnapshotSequence > startFrom &&
              JSON.stringify(newActions).length > storedSnapshot.snapshot.length
            ) {
              res.json({
                ...baseAnswer,
                replayFrom: startFrom,
                replayLog: newActions.slice(storedSnapshotSequence - startFrom),
                snapshot: storedSnapshot.snapshot
              });
            } else {
              res.json({
                ...baseAnswer,
                replayFrom: startFrom,
                replayLog: newActions
              });
            }
          } else {
            res.json({
              ...baseAnswer
            });
          }
          if (actions.length > 0) {
            (clients[req.user.username] || []).forEach(
              c => c.session !== req.headers["x-sync-session"] && c.ws.send("")
            );
          }
          info(`New action log length: ${sequence + actions.length}`);
        } catch (err) {
          error(err);
          res.status(500).end(err);
        }
      });

      delete locks[req.user.username];
    }
  );

  app.ws("/api/updates/:session", (ws, req) => {
    const jwtTokenString = req.headers["sec-websocket-protocol"];
    try {
      const jwtToken = jwt.verify(jwtTokenString, process.env.SECRET);
      info("new update listener");
      if (!clients[jwtToken.username]) {
        clients[jwtToken.username] = [];
      }
      clients[jwtToken.username].push({ ws, session: req.params.session });
      ws.on("close", () => {
        info("update listener disconnected");
        clients[jwtToken.username] = clients[jwtToken.username].filter(
          c => c.ws !== ws
        );
      });
    } catch (err) {
      error(err);
      ws.close();
    }
  });

  const server = app.listen(3001, () =>
    info("Ekofe server listening on port 3001!")
  );

  process.on("SIGTERM", function() {
    server.close(function() {
      process.exit(0);
    });
  });
})();
