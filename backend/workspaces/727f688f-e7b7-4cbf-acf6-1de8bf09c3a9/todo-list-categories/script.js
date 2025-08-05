const todoInput = document.getElementById('todoInput');
const categorySelect = document.getElementById('categorySelect');
const addTodoBtn = document.getElementById('addTodoBtn');
const todoList = document.getElementById('todoList');

let todos = [];

function renderTodos() {
    todoList.innerHTML = '';
    todos.forEach((todo, index) => {
        const todoItem = document.createElement('div');
        todoItem.classList.add('todo-item');
        todoItem.innerHTML = `<span>${todo.text} [${todo.category}]</span><button class="delete-btn">Delete</button>`;
        const deleteButton = todoItem.querySelector('.delete-btn');
        deleteButton.addEventListener('click', () => {
            todos.splice(index, 1);
            renderTodos();
        });
        todoList.appendChild(todoItem);
    });
}

function addTodo() {
    const todoText = todoInput.value.trim();
    const category = categorySelect.value;
    if (todoText !== '') {
        todos.push({ text: todoText, category: category });
        todoInput.value = '';
        renderTodos();
    }
}

addTodoBtn.addEventListener('click', addTodo);