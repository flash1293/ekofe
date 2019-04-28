import find from "ramda/src/find";
import filter from "ramda/src/filter";
import flip from "ramda/src/flip";
import contains from "ramda/src/contains";
import map from "ramda/src/map";
import compose from "ramda/src/compose";
import prop from "ramda/src/prop";
import defaultTo from "ramda/src/defaultTo";
import assoc from "ramda/src/assoc";
import propEq from "ramda/src/propEq";
import isEmpty from "ramda/src/isEmpty";
import not from "ramda/src/not";
import reverse from "ramda/src/reverse";
import { isEmoji } from "../components/ListIcon";

const mappedAssoc = (prop, mapFn) => obj => assoc(prop, mapFn(obj), obj);

const EMPTY_ARRAY = [];
const EMPTY_OBJECT = {};

export default selectors => (state, ownProps) =>
  map(selector => selector(ownProps)(state), selectors);

export const lastVisitedList = () => state =>
  state.visitedList.lastList
    ? list({ listId: state.visitedList.lastList })(state)
    : undefined;

export const lists = () => state =>
  compose(
    map(addEnteredText(state.enteredText)),
    map(addPreferredView(state.preferredView)),
    map(addListItemCount),
    map(addHasRecentItems),
    map(addHasEmoji),
    filterPendingRemovals(state),
    defaultTo(EMPTY_ARRAY),
    prop("currentLists"),
    prop("present"),
    prop("lists")
  )(state);

export const log = ({ searchQuery, listId }) => state =>
  compose(
    reverse,
    filter(
      ({ list, oldList }) =>
        !searchQuery ||
        (list || "").includes(searchQuery) ||
        (oldList || "").includes(searchQuery)
    ),
    filter(
      (item) => !listId || listId === item.listId || listId === item.oldListLid
    ),
    prop("log"),
    prop("present"),
    prop("lists")
  )(state);

const filterPendingRemovals = ({ abortableActions: { REMOVE_LIST } }) =>
  filter(
    compose(
      not,
      compose(
        flip(contains),
        map(prop("list")),
        defaultTo(EMPTY_ARRAY)
      )(REMOVE_LIST),
      prop("uid")
    )
  );

const addPreferredView = preferredView => list => ({
  ...list,
  preferredView: preferredView[list.uid]
});

const addEnteredText = enteredText => list => ({
  ...list,
  enteredText: enteredText[list.uid]
});

const addHasRecentItems = mappedAssoc(
  "hasRecentItems",
  compose(
    not,
    isEmpty,
    prop("recentItems")
  )
);

const addHasEmoji = mappedAssoc(
  "hasLeadingEmoji",
  compose(
    isEmoji,
    defaultTo(""),
    prop("name")
  )
);

const addListItemCount = mappedAssoc(
  "itemCount",
  compose(
    prop("length"),
    filter(
      compose(
        not,
        prop("marker")
      )
    ),
    defaultTo(EMPTY_ARRAY),
    prop("items")
  )
);

export const list = ownProps =>
  compose(
    find(propEq("uid", ownProps.listId)),
    lists()
  );
export const listItems = ownProps =>
  compose(
    prop("items"),
    list(ownProps)
  );

export const user = () =>
  compose(
    defaultTo(EMPTY_OBJECT),
    prop("user")
  );

export const preferredView = () => prop("preferredView");

export const filteredItems = ownProps =>
  compose(
    map(item => ({
      ...item,
      isDivider: /^-{4,}$/.test(item.name)
    })),
    items =>
      items.filter(
        (item, index, items) =>
          !(
            item.marker &&
            (index === items.length - 1 || items[index + 1].marker)
          )
      ),
    defaultTo(EMPTY_ARRAY),
    prop("items"),
    find(propEq("uid", ownProps.listId)),
    lists()
  );

export const merged = () =>
  compose(
    prop("merged"),
    prop("lists")
  );
