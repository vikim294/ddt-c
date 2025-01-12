
import { useEffect, useRef } from "react"
import "./index.scss"

function CanvasTest() {
    
    const offScreenCanvasRef = useRef<HTMLCanvasElement>(null)
    const displayedCanvasRef = useRef<HTMLCanvasElement>(null)
    const canvasTestRef = useRef<HTMLCanvasElement>(null)

    useEffect(()=>{

        if(offScreenCanvasRef.current && displayedCanvasRef.current && canvasTestRef.current) {
            // alert(window.devicePixelRatio)
            const dpr = window.devicePixelRatio

            // css像素/logical pixels
            const logicalWidth = 500 
            const logicalHeight = 500 

            // offscreenCanvas
            // const offscreenCanvas = new OffscreenCanvas(logicalWidth, logicalHeight)
            // const offscreenCtx = offscreenCanvas.getContext('2d') as OffscreenCanvasRenderingContext2D 

            offScreenCanvasRef.current.width = logicalWidth
            offScreenCanvasRef.current.height = logicalHeight
            const offscreenCtx = offScreenCanvasRef.current.getContext('2d') as CanvasRenderingContext2D  

            // draw something first
            offscreenCtx.rect(100, 100, 100, 100)
            offscreenCtx.fillStyle = 'red'
            offscreenCtx.fill()

            offscreenCtx.font = "48px Microsoft YaHei";
            offscreenCtx.fillText('hello vikim~', 50, 50)

            // console.log(JSON.stringify(offscreenCtx.getImageData(100, 100, 2, 2).data))


            /**
             * 如果css像素 200 x 100
             * dpr = 1，则把 200 x 100像素 绘制到 200 x 100 个物理像素上
             * dpr = 2，则把 200 x 100像素 绘制到 400 x 200 个物理像素上，所以会模糊
             * 要消除模糊，只能把 400 x 200像素 绘制到 400 x 200 个物理像素上
             * 所以要根据 dpr 决定 canvas 的 width 和 height
             */

            /**
             * 验证
             * 1. off screen canvas -> 不同dpr屏幕的canvas：drawImage是否能保证清晰度 ok
             * 2. 不同dpr屏幕的canvas -> off screen canvas：drawImage + getImageData是否能获取到完全一致的数据 ok
             */

            // css像素/logical pixels
            displayedCanvasRef.current.style.width = `${logicalWidth}px`
            displayedCanvasRef.current.style.height = `${logicalHeight}px`

            // 设备像素/physical pixels
            displayedCanvasRef.current.width = logicalWidth * dpr
            displayedCanvasRef.current.height = logicalHeight * dpr

            const ctx = displayedCanvasRef.current.getContext('2d') as CanvasRenderingContext2D 

            ctx.scale(dpr, dpr)

            // ctx.rect(100, 100, 100, 100)
            // ctx.fillStyle = 'red'
            // ctx.fill()

            // --- scale 会对 getImageData 有影响，所以还是不要在使用了 scale 的canvas上使用 getImageData！
            // ctx.beginPath()
            // ctx.rect(100, 100, 1, 1)
            // ctx.fillStyle = 'red'
            // ctx.fill()

            // ctx.beginPath()
            // ctx.rect(199, 199, 1, 1)
            // ctx.fillStyle = 'blue'
            // ctx.fill()

            // // red
            // console.log(ctx.getImageData(100 * dpr, 100 * dpr, 1 * dpr, 1 * dpr).data)
            // // blue
            // console.log(ctx.getImageData(199 * dpr, 199 * dpr, 1 * dpr, 1 * dpr).data)

            // --- draw on the on-screen canvas
            // 是否对缩放后的图片进行平滑处理
            ctx.imageSmoothingEnabled = false; 
            ctx.drawImage(offScreenCanvasRef.current, 0, 0, logicalWidth, logicalHeight, 0, 0, logicalWidth, logicalHeight);

            // // --- 
            // canvasTestRef.current.width = logicalWidth
            // canvasTestRef.current.height = logicalHeight

            // const ctxTest = canvasTestRef.current.getContext('2d') as CanvasRenderingContext2D 
            // ctxTest.drawImage(displayedCanvasRef.current, 0, 0, logicalWidth * dpr, logicalHeight * dpr, 0, 0, logicalWidth, logicalHeight)
        
            // // 
            // console.log(JSON.stringify(ctxTest.getImageData(100, 100, 2, 2).data))
        }

    }, [])








    return (
        <div id="canvas-test">
            <canvas ref={offScreenCanvasRef}></canvas>
            <canvas ref={displayedCanvasRef}></canvas>
            <canvas ref={canvasTestRef}></canvas>
        </div>
    )
}


export default CanvasTest