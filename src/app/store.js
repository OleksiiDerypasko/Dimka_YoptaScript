// src/app/store.js
import { createStore, combineReducers, applyMiddleware, compose } from 'redux';
import thunk from 'redux-thunk';

// 1️⃣ Імпортуємо редʼюсер авторизації
import authReducer from '../features/auth/reducer';

// 2️⃣ Якщо пізніше додаватимеш інші фічі (posts, comments тощо),
//    просто імпортуй їх сюди аналогічно:
// import postsReducer from '../features/posts/reducer';
// import commentsReducer from '../features/comments/reducer';

// 3️⃣ Обʼєднуємо всі редʼюсери в один
const rootReducer = combineReducers({
  auth: authReducer,
  // posts: postsReducer,
  // comments: commentsReducer,
});

// 4️⃣ Підключаємо Redux DevTools, якщо вони є в браузері
const composeEnhancers = window.__REDUX_DEVTOOLS_EXTENSION_COMPOSE__ || compose;

// 5️⃣ Створюємо store з middleware thunk (для асинхронних запитів)
export const store = createStore(
  rootReducer,
  composeEnhancers(applyMiddleware(thunk))
);
