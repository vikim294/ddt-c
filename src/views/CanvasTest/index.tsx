
import { useEffect, useRef } from "react"
import "./index.scss"

function CanvasTest() {
    
    const offScreenCanvasRef1 = useRef<HTMLCanvasElement>(null)
    const offScreenCanvasRef2 = useRef<HTMLCanvasElement>(null)
    const displayedCanvasRef = useRef<HTMLCanvasElement>(null)
    const canvasTestRef = useRef<HTMLCanvasElement>(null)

    useEffect(()=>{

        if(offScreenCanvasRef1.current && offScreenCanvasRef2.current && displayedCanvasRef.current && canvasTestRef.current) {
            // alert(window.devicePixelRatio)
            const dpr = window.devicePixelRatio

            // offscreenCanvas
            // const offscreenCanvas = new OffscreenCanvas(logicalWidth, logicalHeight)
            // const offscreenCtx = offscreenCanvas.getContext('2d') as OffscreenCanvasRenderingContext2D 

            // offScreenCanvasRef1 普通的canvas
            offScreenCanvasRef1.current.width = 300
            offScreenCanvasRef1.current.height = 400
            const offscreenCtx1 = offScreenCanvasRef1.current.getContext('2d') as CanvasRenderingContext2D  

            offscreenCtx1.lineWidth = 1
            // draw something first
            // stroke
            offscreenCtx1.beginPath()
            offscreenCtx1.strokeStyle = 'red'
            offscreenCtx1.strokeRect(40, 75, 50, 50)

            // rect
            offscreenCtx1.beginPath()
            offscreenCtx1.rect(100, 100, 100, 100)
            offscreenCtx1.fillStyle = 'red'
            offscreenCtx1.fill()

            // text
            offscreenCtx1.beginPath()
            offscreenCtx1.font = "48px Microsoft YaHei";
            offscreenCtx1.fillText('hello vikim~', 50, 50)

            // console.log(JSON.stringify(offscreenCtx.getImageData(100, 100, 2, 2).data))

            // offScreenCanvasRef2 根据dpr的canvas
            offScreenCanvasRef2.current.style.width = `${600}px`
            offScreenCanvasRef2.current.style.height = `${200}px`

            offScreenCanvasRef2.current.width = 600 * dpr
            offScreenCanvasRef2.current.height = 200 * dpr
            const offscreenCtx2 = offScreenCanvasRef2.current.getContext('2d') as CanvasRenderingContext2D  
            offscreenCtx2.scale(dpr, dpr)

            // stroke
            offscreenCtx2.beginPath()
            offscreenCtx2.strokeStyle = 'blue'
            offscreenCtx2.strokeRect(100, 60, 100, 100)

            // rect
            offscreenCtx2.beginPath()
            offscreenCtx2.rect(205, 70, 100, 100)
            offscreenCtx2.fillStyle = 'green'
            offscreenCtx2.fill()

            // text
            offscreenCtx2.beginPath()
            offscreenCtx2.font = "48px Microsoft YaHei";
            offscreenCtx2.fillText('hello vikim~', 0, 50)

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
            const logicalWidth = 400 
            const logicalHeight = 400

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
            // 不论 offScreenCanvas 和 displayedCanvas 的width/height 是否一致、是否成比例，
            // 只要 displayedCanvas 的物理像素宽高/css像素宽高 = dpr，那么其上的图像就是清晰的，
            // 只是 调用ctx.drawImage时要注意：
            // .drawImage(image: CanvasImageSource, sx: number, sy: number, sw: number, sh: number, dx: number, dy: number, dw: number, dh: number)
            ctx.drawImage(offScreenCanvasRef1.current, 20, 10, 250, 125, 0, 0, 250, 125);
            // 1.sx, sy是在源canvas上 以物理像素为单位的偏移
            // 2.dx, dy, dw, dh都是在目标canvas上 以css像素为单位的偏移（因为已经ctx.scale(dpr, dpr)了）
            // 3.将源canvas 绘制到 目标canvas上时，要得到清晰的图像，sw, sh就应该是目标canvas的物理像素宽高： logicalWidth * dpr 和 logicalHeight * dpr
            ctx.drawImage(offScreenCanvasRef2.current, 0, 0, logicalWidth * dpr, logicalHeight * dpr, 100, 100, logicalWidth, logicalHeight);

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
            <canvas ref={offScreenCanvasRef1} style={{backgroundColor: '#fafafa'}}></canvas>
            <canvas ref={offScreenCanvasRef2} style={{backgroundColor: '#f9f9f9'}}></canvas>
            <canvas ref={displayedCanvasRef} style={{backgroundColor: '#f6f6f6'}}></canvas>
            <canvas ref={canvasTestRef}></canvas>
        </div>
    )
}

export default CanvasTest