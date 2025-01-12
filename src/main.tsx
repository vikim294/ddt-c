// import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import GameRoom from './views/GameRoom/index.tsx'
import BattleField from './views/Battlefield/index.tsx'
import CanvasTest from './views/CanvasTest/index.tsx'

import "./main.scss"

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
    }
])



createRoot(document.getElementById('root')!).render(
    <RouterProvider router={router}></RouterProvider>
)
