import { clientSession, API_PROTOCOL, API_HOST } from "../config";

const syncActions = [
  "persist/REHYDRATE",
  "@@sync/SYNC",
  "@@sync/MERGE",
  "LOGIN_SUCCESS"
];

export default store => next => {
  const dispatchRefresh = () =>
    next({ type: "@@sync/REQUEST_SYNC", key: "lists" });
  let connection = null;
  const setupWs = () => {
    if (connection !== null) return;
    connection = new WebSocket(
      `ws${
        API_PROTOCOL === "https:" ? "s" : ""
      }://${API_HOST}/api/updates/${clientSession}`,
      store.getState().user.token
    );
    connection.onmessage = () => {
      console.log("update push received");
      dispatchRefresh();
    };
    connection.onerror = e => {
      console.log("websocket-error", e);
    };
    connection.onclose = () => {
      console.log("closed, restart websocket");
      connection = null;
      setTimeout(setupWs, 1000);
    };
  };
  setInterval(() => {
    if (connection !== null && connection.readyState === 3) {
      console.log(
        "websocket connection got killed without onclose, restarting"
      );
      connection = null;
      setupWs();
    }
  }, 2000);
  return action => {
    const result = next(action);
    if (
      store.getState().user.loggedIn &&
      syncActions.indexOf(action.type) > -1
    ) {
      setupWs();
    }
    return result;
  };
};
