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
import { ReactNode } from 'react'
import { Provider } from 'react-redux'
import store from "./store/index.ts"

const router = createBrowserRouter([
    {
        path: '/gameRoom',
        element: <GameRoom></GameRoom>
    },
    {
        path: '/battleField',
        element: <BattleField></BattleField>
    },
    {
        path: '/canvasTest',
        element: <CanvasTest></CanvasTest>
    },
    {
        path: '/',
        element: <Home></Home>
    },
    {
        path: '/register',
        element: <Register></Register>
    },
    {
        path: '/login',
        element: <Login></Login>
    }
])

type Props = { children: ReactNode }

const App: React.FC<Props> = ({children}) => {

    const viewportWidth = 800
    const viewportHeight = 600

    return (
        <div id="app" style={{
            width: viewportWidth,
            height: viewportHeight,
        }}>
            {children}
        </div>
    )
}

createRoot(document.getElementById('root')!).render(
    // Provide the Redux store to the React app
    <Provider store={store}>
        <App>
            <RouterProvider router={router}></RouterProvider>
        </App>
    </Provider>
)
