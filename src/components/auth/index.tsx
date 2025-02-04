import { Navigate } from "react-router-dom"
import { useAppSelector } from "../../store/hooks"

function Auth({ children }: { children: React.ReactNode }) {
    const userInfo = useAppSelector(state => state.userInfo.value)

    // 未登录 且访问需要权限的路由时 跳转到登录页面
    if(!userInfo) {
        return <Navigate to={'/login'} replace></Navigate>
    }

    return children
}

export default Auth