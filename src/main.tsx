// import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import GameRoom from './views/GameRoom/index.tsx'
import BattleField from './views/Battlefield/index.tsx'
import CanvasTest from './views/CanvasTest/index.tsx'

import "./main.scss"
import { ReactNode } from 'react'

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

type Props = { children: ReactNode }

const ViewPort: React.FC<Props> = ({children}) => {

    const viewportWidth = 800
    const viewportHeight = 600

    return (
        <div id="viewport" style={{
            width: viewportWidth,
            height: viewportHeight,
        }}>
            {children}
        </div>
    )
}

createRoot(document.getElementById('root')!).render(
    <ViewPort>
        <RouterProvider router={router}></RouterProvider>
    </ViewPort>
)
