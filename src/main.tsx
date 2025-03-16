// import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import GameRoom from './views/GameRoom/index.tsx'
import BattleField from './views/Battlefield/index.tsx'
import CanvasTest from './views/CanvasTest/index.tsx'
import Home from './views/Home/index.tsx'
import Register from './views/Register/index.tsx'
import Login from './views/Login/index.tsx'

import "./main.scss"
import { Provider } from 'react-redux'
import store from "./store/index.ts"
import { SocketProvider } from './context/socket/socketProvider.tsx'
import OfflineMask from './views/OfflineMask/index.tsx'
import NotFound from './views/NotFound/index.tsx'
import Auth from './components/auth/index.tsx'
import App from './App.tsx'

const router = createBrowserRouter([
    {
        path: '/gameRoom/:gameRoomId',
        element: <Auth>
            <GameRoom></GameRoom>
        </Auth>
    },
    {
        path: '/battleField/:gameRoomId/:battlefieldId',
        element: <Auth>
            <BattleField></BattleField>
        </Auth>
    },
    {
        path: '/canvasTest',
        element: <Auth>
            <CanvasTest></CanvasTest>
        </Auth>
    },
    {
        path: '/',
        element: <Auth>
            <Home></Home>
        </Auth>
    },
    {
        path: '/register',
        element: <Register></Register>
    },
    {
        path: '/login',
        element: <Login></Login>
    },
    {
        path: '*',
        element: <Auth>
            <NotFound></NotFound>
        </Auth>
    }
])

createRoot(document.getElementById('root')!).render(
    // Provide the Redux store to the React app
    <Provider store={store}>
        <SocketProvider>
            <App>
                <RouterProvider router={router}></RouterProvider>
                <OfflineMask></OfflineMask>
            </App>
        </SocketProvider>
    </Provider>
)
