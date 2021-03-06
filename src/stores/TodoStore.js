import AppDispatcher from '../dispatcher/AppDispatcher';
import { EventEmitter } from 'events';
import TodoConstants from '../constants/TodoConstants';
import assign from 'object-assign';
import _ from 'lodash';

const CHANGE_EVENT = 'change';

const _todos = {};
let _statusFilter = 'all';

const create = (text, parentId) => {
  const id = (+new Date() + Math.floor(Math.random() * 999999)).toString(32);
  const item = {
    id,
    completed: false,
    text,
    parentId,
    children: parentId ? false : {},
  };

  if (parentId) {
    _todos[parentId].children[id] = item;
  } else {
    _todos[id] = item;
  }
};

const updateCompleted = (id, parentId, updates) => {
  if (parentId) {
    _todos[parentId].children[id] = assign({}, _todos[parentId].children[id], updates);
  } else {
    _todos[id] = assign({}, _todos[id], updates);

    for (const childKey in _todos[id].children) {
      if ({}.hasOwnProperty.call(_todos[id].children, childKey)) {
        _todos[id].children[childKey] = assign({}, _todos[id].children[childKey], updates);
      }
    }
  }
};

const updateText = (id, parentId, updates) => {
  if (parentId) {
    _todos[parentId].children[id] = assign({}, _todos[parentId].children[id], updates);
  } else {
    _todos[id] = assign({}, _todos[id], updates);
  }
};

const updateCompletedAll = (updates) => {
  for (const id in _todos) {
    if ({}.hasOwnProperty.call(_todos, id)) {
      updateCompleted(id, false, updates);
    }
  }
};

const remove = (id, parentId) => {
  if (parentId) {
    delete _todos[parentId].children[id];
  } else {
    delete _todos[id];
  }
};

const removeAll = () => {
  for (const id in _todos) {
    if ({}.hasOwnProperty.call(_todos, id)) {
      remove(id);
    }
  }
};

const removeCompleted = () => {
  for (const id in _todos) {
    if (_todos[id].completed) {
      remove(id, false);
      continue;
    }
    _.forEach(_.filter(_todos[id].children, 'completed'), (value) => {
      remove(value.id, value.parentId);
    });
  }
};

const TodoStore = assign({}, EventEmitter.prototype, {
  areAllCompleted() {
    for (const id in _todos) {
      if (!_todos[id].completed) {
        return false;
      }
    }
    return true;
  },

  getAll() {
    return _todos;
  },

  completeParent() {
    for (const id in _todos) {
      if ({}.hasOwnProperty.call(_todos, id)) {
        const completedChildren = (_.filter(_todos[id].children, 'completed').length);
        const childrenLength = Object.keys(_todos[id].children).length;

        if (childrenLength) {
          if (completedChildren === childrenLength) {
            _todos[id] = assign({}, _todos[id], { completed: true });
          } else {
            _todos[id] = assign({}, _todos[id], { completed: false });
          }
        }
      }
    }
  },

  getStatusFilter() {
    return _statusFilter;
  },

  emitChange() {
    this.emit(CHANGE_EVENT);
  },

  addChangeListener(callback) {
    this.on(CHANGE_EVENT, callback);
  },

  removeChangeListener(callback) {
    this.removeListener(CHANGE_EVENT, callback);
  },
});

AppDispatcher.register((action) => {
  let text;

  switch (action.actionType) {
  case TodoConstants.TODO_CREATE :
    text = action.text.trim();
    if (text !== '') {
      create(text, action.parentId);
      TodoStore.emitChange();
    }
    break;

  case TodoConstants.TODO_UNDO_COMPLETE :
    updateCompleted(action.id, action.parentId, { completed: false });
    TodoStore.emitChange();
    break;

  case TodoConstants.TODO_COMPLETE :
    updateCompleted(action.id, action.parentId, { completed: true });
    TodoStore.emitChange();
    break;

  case TodoConstants.TODO_TOGGLE_COMPLETE_ALL :
    if (TodoStore.areAllCompleted()) {
      updateCompletedAll({ completed: false });
    } else {
      updateCompletedAll({ completed: true });
    }
    TodoStore.emitChange();
    break;

  case TodoConstants.TODO_REMOVE :
    remove(action.id, action.parentId);
    TodoStore.emitChange();
    break;

  case TodoConstants.TODO_REMOVE_ALL :
    removeAll();
    TodoStore.emitChange();
    break;

  case TodoConstants.TODO_REMOVE_COMPLETED :
    removeCompleted();
    TodoStore.emitChange();
    break;

  case TodoConstants.TODO_UPDATE_TEXT :
    text = action.text.trim();
    if (text !== '') {
      updateText(action.id, action.parentId, { text });
      TodoStore.emitChange();
    }
    break;

  case TodoConstants.TODO_SET_STATUS_FILTER :
    _statusFilter = action.filter;
    TodoStore.emitChange();
    break;

  default:
    break;
  }
});

module.exports = TodoStore;
