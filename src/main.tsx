// import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import GameRoom from './views/GameRoom/index.tsx'
import BattleField from './views/Battlefield/index.tsx'


const router = createBrowserRouter([
    {
        path: '/gameRoom',
        element: <GameRoom></GameRoom>
    },
    {
        path: '/battleField',
        element: <BattleField></BattleField>
    }
])



createRoot(document.getElementById('root')!).render(
    <RouterProvider router={router}></RouterProvider>
)
