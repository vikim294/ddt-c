import { useRef, useEffect, MouseEvent } from "react";
import { Viewport } from "../../../libs/viewport";

interface Props {
    miniViewportTranslate: {
        x: number
        y: number
    }
    miniMapSize: {
        miniMapWidth: number
        miniMapHeight: number
        miniViewportWidth: number
        miniViewportHeight: number
    },
    viewportRef: React.MutableRefObject<Viewport | null>
    onMiniMapUpdate: (translateX: number, translateY: number) => void
    setMiniViewportTranslate: React.Dispatch<React.SetStateAction<{
        x: number;
        y: number;
    }>>
}

const MiniMap: React.FC<Props> = ({ miniViewportTranslate, miniMapSize, viewportRef, onMiniMapUpdate, setMiniViewportTranslate }) => {
    const {
        miniMapWidth,
        miniMapHeight,
        miniViewportWidth,
        miniViewportHeight,
    } = miniMapSize

    const isPressing = useRef(false)
    const pre = useRef<{
        x: number | null
        y: number | null
    }>({
        x: null,
        y: null,
    })

    const onMouseDown = (e: MouseEvent<HTMLDivElement, globalThis.MouseEvent>) => {
        // 游戏预览结束后 才能进行操作
        if(!viewportRef.current?.isGamePreviewOver) return
        // 用户拖动miniMap时，禁用 viewport的跟随/移动
        viewportRef.current.isDraggingMiniViewport = true
        isPressing.current = true

        const {
            clientX,
            clientY
        } = e

        pre.current.x = clientX
        pre.current.y = clientY

        document.body.style.userSelect = 'none'
    }

    useEffect(() => {
        const onMouseMove = (e: globalThis.MouseEvent) => {
            if (!isPressing.current) return

            const {
                clientX,
                clientY
            } = e

            const incX = clientX - pre.current.x!
            const incY = clientY - pre.current.y!

            pre.current = {
                x: clientX,
                y: clientY,
            }

            const newTranslateX = miniViewportTranslate.x + incX
            const newTranslateY = miniViewportTranslate.y + incY

            if (newTranslateX >= 0 && newTranslateY >= 0 && newTranslateX <= miniMapWidth - miniViewportWidth && newTranslateY <= miniMapHeight - miniViewportHeight) {
                setMiniViewportTranslate({
                    x: newTranslateX,
                    y: newTranslateY
                })

                onMiniMapUpdate(newTranslateX, newTranslateY)
            }
        }

        const onMouseUp = () => {
            if(viewportRef.current) {
                viewportRef.current.isDraggingMiniViewport = false
            }
            isPressing.current = false
            document.body.style.userSelect = 'unset'
        }

        document.addEventListener('mousemove', onMouseMove)
        document.addEventListener('mouseup', onMouseUp)

        return () => {
            document.removeEventListener('mousemove', onMouseMove)
            document.removeEventListener('mouseup', onMouseUp)
        }
    }, [miniViewportTranslate])

    return (
        <div id="mini-map" style={{
            width: miniMapWidth,
            height: miniMapHeight
        }}>
            <div id="mini-viewport" style={{
                width: miniViewportWidth,
                height: miniViewportHeight,
                transform: `translate(${miniViewportTranslate.x}px, ${miniViewportTranslate.y}px)`
            }} onMouseDown={onMouseDown}>
            </div>
        </div>
    )
}

export default MiniMap