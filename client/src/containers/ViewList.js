import React from "react";
import { Link } from "react-router-dom";
import AppBar from "@material-ui/core/AppBar";
import Toolbar from "@material-ui/core/Toolbar";
import Divider from "@material-ui/core/Divider";
import Typography from "@material-ui/core/Typography";
import List from "@material-ui/core/List";
import ListItem from "@material-ui/core/ListItem";
import ListItemIcon from "@material-ui/core/ListItemIcon";
import ListItemText from "@material-ui/core/ListItemText";
import IconButton from "@material-ui/core/IconButton";
import Edit from "@material-ui/icons/Edit";
import DoneAll from "@material-ui/icons/DoneAll";
import ArrowBack from "@material-ui/icons/ArrowBack";
import { connect } from "react-redux";
import { compose } from "redux";
import LongPress from "@johannes.reuter/react-long";
import { withHandlers, pure } from "recompose";
import { I18n } from "react-i18next";
import windowSize from "react-window-size";
import routerContext from "../components/RouterContext";
import { Shortcuts } from "react-shortcuts";

import ListIcon, { filterLeadingEmoji } from "../components/ListIcon";
import ItemContextDialog from "../components/ItemContextDialog";
import editDialog from "../components/EditDialog";
import preferredView from "../components/PreferredView";
import redirectToLogin from "../components/RedirectToLogin";
import redirectToHome from "../components/RedirectToHome";
import ListMenu from "../components/ListMenu";
import InlineNavigation from "../components/InlineNavigation";
import removeAnimation from "../components/RemoveAnimation";
import routeParam from "../components/RouteParam";
import buildHandlers, {
  removeItem,
  moveItemToBottom,
  setPreferredView,
  moveItemToList,
  visitList
} from "../redux/actions";
import buildSelector, {
  list,
  lists,
  filteredItems,
  lastVisitedList
} from "../redux/selectors";
import ItemCount from "../components/ItemCount";

const labelColor = label =>
  label === `weekday_${new Date().getDay() - 1}` ? "#bbb" : "#eee";

// touch-support feature detection
let touchSupport = true;
try {
  document.createEvent("TouchEvent");
} catch (e) {
  touchSupport = false;
}

const ViewListItem = compose(
  pure,
  withHandlers({
    handleRemove: ownProps => () => ownProps.removeItem(ownProps.item),
    handleContextMenu: ownProps => e => {
      if (e) {
        e.preventDefault();
      }
      ownProps.handleContextMenu(ownProps.item);
    },
    handleTouchEnd: ({ isDialogOpen }) => e => {
      if (isDialogOpen) {
        e.preventDefault();
      }
    }
  }),
  removeAnimation("handleRemove")
)(
  ({
    item,
    onRemoveDelayed,
    hideClassName,
    handleContextMenu,
    handleTouchEnd
  }) => {
    const element = (
      <ListItem
        style={
          item.marker
            ? {
                backgroundColor: labelColor(item.label),
                paddingTop: 5,
                paddingBottom: 5
              }
            : {
                wordBreak: "break-word"
              }
        }
        button={!item.marker}
        onContextMenu={handleContextMenu}
        onClick={item.marker ? undefined : onRemoveDelayed}
      >
        {item.label ? (
          <I18n>{t => <ListItemText secondary={t(item.label)} />}</I18n>
        ) : (
          <ListItemText primary={item.name} className={hideClassName} />
        )}
      </ListItem>
    );

    return touchSupport ? (
      <LongPress
        time={1000}
        onTouchEnd={handleTouchEnd}
        onLongPress={handleContextMenu}
      >
        {element}
      </LongPress>
    ) : (
      element
    );
  }
);

export const ViewList = ({
  list,
  lastVisitedList,
  filteredItems: items,
  lists,
  listId,
  removeItem,
  moveItemToBottom,
  moveItemToList,
  dialogItem,
  handleDialogOpen,
  handleDialogClose,
  windowWidth,
  handleShortcuts
}) => (
  <I18n>
    {t => (
      <div>
        <AppBar position="static" color="primary">
          <Shortcuts
            name="SHOPPING_VIEW"
            stopPropagation={false}
            targetNodeSelector="body"
            handler={handleShortcuts}
          />
          <Toolbar>
            <Link tabIndex={-1} to="/">
              <IconButton color="inherit">
                <ArrowBack />
              </IconButton>
            </Link>
            <Typography variant="h6" color="inherit" style={{ flex: 1 }}>
              {list.name} <ItemCount count={list.itemCount} />
            </Typography>
            <Link tabIndex={-1} to={`/lists/${listId}/entries/edit`}>
              <IconButton aria-label={t("list_editview_label")} color="inherit">
                <Edit />
              </IconButton>
            </Link>
            <ListMenu list={list} />
          </Toolbar>
        </AppBar>
        <div
          style={{
            display: "flex",
            flexDirection: "row"
          }}
        >
          {windowWidth > 700 && lists.length > 1 && (
            <List
              style={{
                flex: "1 1 auto",
                boxShadow: "inset 0 0 25px rgba(0,0,0,0.3)",
                backgroundColor: "#f5f5f5",
                minHeight: "calc(100vh - 80px)",
                paddingBottom: 90
              }}
            >
              {lists.map((list, index) => (
                <ListItem
                  key={list.uid}
                  tabIndex={-1}
                  button
                  style={
                    list.uid === listId
                      ? { backgroundColor: "#bbb" }
                      : { opacity: list.itemCount ? 1 : 0.5 }
                  }
                >
                  <ListItemIcon>
                    <ListIcon name={list.name} />
                  </ListItemIcon>
                  <Link
                    style={{
                      flex: 1,
                      paddingLeft: 15,
                      marginTop: "-12px",
                      marginBottom: "-12px",
                      paddingTop: 12,
                      paddingBottom: 12
                    }}
                    to={`/lists/${list.uid}/entries${
                      list.preferredView === "edit" ? "/edit" : ""
                    }`}
                  >
                    <ListItemText
                      primary={filterLeadingEmoji(list.name)}
                      secondary={`${list.itemCount} ${t("list_entries")} `}
                    />
                  </Link>
                </ListItem>
              ))}
            </List>
          )}
          <div
            style={{
              marginBottom: 60,
              flex: "5 1 0",
              display: "flex",
              justifyContent: "center"
            }}
          >
            {items.length > 0 ? (
              <List style={{ marginBottom: 60, flex: "1" }}>
                {items.map((item, index) =>
                  item.isDivider ? (
                    <Divider key={`divider-${index}`} />
                  ) : (
                    <ViewListItem
                      item={item}
                      key={item.uid ? item.uid : item.label}
                      removeItem={removeItem}
                      isDialogOpen={Boolean(dialogItem)}
                      handleContextMenu={handleDialogOpen}
                    />
                  )
                )}
              </List>
            ) : (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  color: "#aaa",
                  marginTop: "50px"
                }}
              >
                <DoneAll />
                <Typography color="inherit">{t("list_noentries")}</Typography>
              </div>
            )}
          </div>
        </div>
        <InlineNavigation currentList={list} lastList={lastVisitedList} />
        {dialogItem && (
          <ItemContextDialog
            item={dialogItem}
            lists={lists}
            currentListId={listId}
            onClose={handleDialogClose}
            removeItem={removeItem}
            moveToBottom={moveItemToBottom}
            moveToList={moveItemToList}
          />
        )}
      </div>
    )}
  </I18n>
);

export default compose(
  redirectToLogin,
  routeParam("id", "listId"),
  connect(
    buildSelector({ lists, list, filteredItems, lastVisitedList }),
    buildHandlers({
      removeItem,
      moveItemToBottom,
      setPreferredView,
      moveItemToList,
      visitList
    })
  ),
  editDialog("Item"),
  redirectToHome,
  windowSize,
  preferredView("shop"),
  routerContext,
  withHandlers({
    handleShortcuts: ({ history, listId, lists }) => action => {
      switch (action) {
        case "EDIT_MODE":
          history.push(`/lists/${listId}/entries/edit`);
          break;
        case "NEXT_LIST":
          const nextList = lists[lists.findIndex(l => l.uid === listId) + 1];
          if (nextList) {
            history.push(
              `/lists/${nextList.uid}/entries${
                nextList.preferredView === "edit" ? "/edit" : ""
              }`
            );
          }
          break;
        case "PREVIOUS_LIST":
          const previousList =
            lists[lists.findIndex(l => l.uid === listId) - 1];
          if (previousList) {
            history.push(
              `/lists/${previousList.uid}/entries${
                previousList.preferredView === "edit" ? "/edit" : ""
              }`
            );
          }
          break;
        default:
          break;
      }
    }
  })
)(ViewList);
