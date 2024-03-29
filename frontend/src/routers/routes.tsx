import { createBrowserRouter } from 'react-router-dom';
import { Home } from '../pages/home';
import { App } from '../App';
import Login from '../pages/auth/login';
import Signup from '../pages/auth/signup';
import UserProfile from '../pages/user';
import { PrivateRoute } from './PrivateRoute';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <App/>,
    children: [
      { path: '/', element: <Home/> },
      { path: '/auth/login', element: <Login/> },
      { path: '/auth/signup', element: <Signup/> },
      { element: <PrivateRoute/>, children: [
        { path: '/user/:userId', element: <UserProfile/> },
      ]}
    ],
  }
]);