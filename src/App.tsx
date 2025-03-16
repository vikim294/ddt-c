import { ReactNode, useEffect } from "react"
import { useAppSelector } from "./store/hooks"
import { requestNewToken } from "./utils/requestNewToken"

type Props = { children: ReactNode }


const App: React.FC<Props> = ({children}) => {
    const resolution = useAppSelector((state) => state.resolution.value)

    useEffect(()=>{
        console.log('App mounted')

        // 刷新页面后 请求新 token
        requestNewToken()
    }, [])
    
    return (
        <div id="app" style={{
            width: resolution.width,
            height: resolution.height,
        }}>
            {children}
        </div>
    )
}

export default App