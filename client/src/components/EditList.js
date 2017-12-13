import React, { Component } from "react";
import AppBar from "material-ui/AppBar";
import { Link } from "react-router-dom";
import Button from "material-ui/Button";
import { List, ListItem } from "material-ui/List";
import TextField from "material-ui/TextField";
import {
  SortableContainer,
  SortableElement,
  SortableHandle
} from "react-sortable-hoc";
import IconButton from "material-ui/IconButton";
import NavigationArrowBack from "material-ui/svg-icons/navigation/arrow-back";
import ActionHistory from "material-ui/svg-icons/action/history";
import ActionShoppingBasket from "material-ui/svg-icons/action/shopping-basket";
import DragHandle from "material-ui/svg-icons/editor/drag-handle";
import Divider from "material-ui/Divider";
import Dialog from "material-ui/Dialog";
import ContentRemove from "material-ui/svg-icons/content/remove";
import Paper from "material-ui/Paper";
import { connect } from "react-redux";
import uuid from "uuid/v4";
import { Redirect } from "react-router";
import {
  BottomNavigation,
  BottomNavigationItem
} from "material-ui/BottomNavigation";

import redirectToLogin from "./RedirectToLogin";

const SortableDragHandle = SortableHandle(() => <DragHandle />);

const SortableItem = SortableElement(({ item, onClick, onRemove }) => {
  const containerStyle = {
    display: "flex",
    alignItems: "center"
  };
  const labelStyle = {
    paddingLeft: "10px"
  };

  return (
    <ListItem
      onClick={onClick}
      rightIconButton={
        <IconButton onClick={onRemove}>
          <ContentRemove />
        </IconButton>
      }
    >
      <div style={containerStyle}>
        <SortableDragHandle /> <span style={labelStyle}>{item.name}</span>
      </div>
    </ListItem>
  );
});

const SortableList = SortableContainer(({ items, onClick, onRemove }) => {
  return (
    <List>
      {items.map((item, index) => (
        <SortableItem
          key={item.uid}
          index={index}
          onClick={() => onClick(item)}
          onRemove={() => onRemove(item)}
          item={item}
        />
      ))}
    </List>
  );
});

export class EditList extends Component {
  state = {
    addText: "",
    dialogId: null
  };
  onRequestAdd = () => {
    this.setState({ addMode: true }, () => {
      this.addInput.focus();
    });
  };
  onAdd = e => {
    e.preventDefault();
    this.props.onAdd(this.state.addText);
    this.setState(state => ({
      addText: ""
    }));
  };
  onChangeAddText = (_, value) => {
    this.setState({
      addText: value
    });
  };
  onSortEndActive = ({ oldIndex, newIndex }) => {
    if (oldIndex === newIndex) return;
    this.props.onMove(
      this.props.activeItems[oldIndex].uid,
      this.props.activeItems[newIndex].uid
    );
  };
  onToggle = item => {
    this.props.onToggle(item.uid);
  };
  handleDialogClose = () => {
    this.setState({ dialogId: null });
  };
  onItemClick = item => {
    this.setState({ dialogId: item.uid, dialogText: item.name });
  };
  onChangeDialogText = (_, value) => {
    this.setState({
      dialogText: value
    });
  };
  onRemoveItem = item => {
    this.props.onToggle(item.uid);
  };
  handleChangeItem = e => {
    e.preventDefault();
    this.props.onChangeItem(this.state.dialogId, this.state.dialogText);
    this.setState({ dialogId: null, dialogText: "" });
  };
  render() {
    if (!this.props.uid) return <Redirect to="/" />;
    const dialogActions = [
      <Button
        label="Abbrechen"
        primary={false}
        onClick={this.handleDialogClose}
      />,
      <Button
        label="Speichern"
        primary={true}
        onClick={this.handleChangeItem}
      />
    ];
    return (
      <div>
        <AppBar
          title={`${this.props.name} editieren`}
          iconElementLeft={
            <IconButton
              containerElement={
                <Link to={`/lists/${this.props.match.params.id}`} />
              }
            >
              <NavigationArrowBack />
            </IconButton>
          }
        />
        <form onSubmit={this.onAdd} style={{ margin: "10px" }}>
          <TextField
            fullWidth
            key="add-textfield"
            ref={el => (this.addInput = el)}
            value={this.state.addText}
            onChange={this.onChangeAddText}
            hintText="Neuer Eintrag"
          />
        </form>

        <SortableList
          items={this.props.activeItems}
          onSortEnd={this.onSortEndActive}
          onClick={this.onItemClick}
          onRemove={this.onRemoveItem}
          useDragHandle
        />
        {this.props.doneItems.length > 0 && <Divider inset={true} />}
        {this.props.doneItems.length > 0 && (
          <Button
            labelStyle={{ fontSize: "0.7em" }}
            label="Erledigte Löschen"
            onClick={this.props.onRemove}
          />
        )}
        <List style={{ paddingBottom: "65px" }}>
          {this.props.doneItems.map((item, index) => (
            <ListItem
              style={{ color: "#aaa" }}
              key={index}
              primaryText={item.name}
              onClick={() => this.onToggle(item)}
            />
          ))}
        </List>
        <Paper
          style={{
            position: "fixed",
            bottom: "10px",
            right: "10px",
            left: "10px"
          }}
          zDepth={1}
        >
          <BottomNavigation selectedIndex={this.state.selectedIndex}>
            <Link to={`/lists/${this.props.uid}/edit/last-used`}>
              <BottomNavigationItem
                label="Zuletzt verwendet"
                icon={<ActionHistory />}
              />
            </Link>
            <Link to={`/lists/${this.props.uid}/edit/categories`}>
              <BottomNavigationItem
                label="Kategorien"
                icon={<ActionShoppingBasket />}
              />
            </Link>
          </BottomNavigation>
        </Paper>
        <Dialog
          title="Eintrag ändern"
          actions={dialogActions}
          modal={false}
          open={this.state.dialogId !== null}
          onRequestClose={this.handleDialogClose}
        >
          <form onSubmit={this.handleChangeItem}>
            <TextField
              name="editField"
              fullWidth
              autoFocus
              value={this.state.dialogText}
              onChange={this.onChangeDialogText}
            />
          </form>
        </Dialog>
      </div>
    );
  }
}

export const ConnectedEditList = redirectToLogin(
  connect(
    (state, ownProps) => {
      const list = state.lists.present.find(
        l => l.uid === ownProps.match.params.id
      );
      return {
        ...list,
        doneItems: list.items.filter(i => i.done),
        activeItems: list.items.filter(i => !i.done)
      };
    },
    (dispatch, ownProps) => ({
      onAdd: name => {
        dispatch({
          type: "ADD_ITEM",
          list: ownProps.match.params.id,
          uid: uuid(),
          name
        });
      },
      onRemove: () => {
        dispatch({
          type: "REMOVE_DONE",
          list: ownProps.match.params.id
        });
      },
      onChangeItem: (item, name) => {
        dispatch({
          type: "EDIT_ITEM",
          list: ownProps.match.params.id,
          item,
          name
        });
      },
      onMove: (oldId, newId) => {
        dispatch({
          type: "MOVE_ITEM",
          list: ownProps.match.params.id,
          oldId,
          newId
        });
      },
      onToggle: index => {
        dispatch({
          type: "TOGGLE_ITEM",
          list: ownProps.match.params.id,
          item: index
        });
      }
    })
  )(EditList)
);
