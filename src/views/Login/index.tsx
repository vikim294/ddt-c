
import { useState } from "react"
import { useNavigate } from "react-router-dom";
import "./index.scss"
import { setUserInfo } from "../../store/userInfoSlice";
import { useAppDispatch } from "../../store/hooks";
import { userLogin } from "../../api/user";
import { startRequestNewTokenTimer } from "../../utils/requestNewToken";

function Login() {
    const navigate = useNavigate();
    const dispatch = useAppDispatch()
     
    const [username, setUsername] = useState('')
    const [password, setPassword] = useState('')

    async function handleLogin() {

        console.log(username, password)

        const { data: { userInfo } } = await userLogin({
            username,
            password
        })

        console.log(userInfo)

        // 将 用户信息 和 token 存到本地存储，之后的请求携带token
        localStorage.setItem('userInfo', JSON.stringify(userInfo))

        // 存 全局状态中
        dispatch(setUserInfo(userInfo))

        // reset
        setUsername('')
        setPassword('')

        // 登录成功 40mins后 发送更新token请求
        startRequestNewTokenTimer()

        // 跳转到 home
        navigate("/");
    }

    return (
        <div className="login">
            <h1>login</h1>
            <div>
                <label>username:</label>
                <input type="text" value={username} onChange={(e) => {
                    setUsername(e.target.value)
                }} onKeyUp={(e) => {
                    if(e.code === 'Enter') {
                        handleLogin()
                    }
                }} />
            </div>
            <div>
                <label>password:</label>
                <input type="password" value={password} onChange={(e) => {
                    setPassword(e.target.value)
                }} onKeyUp={(e) => {
                    if(e.code === 'Enter') {
                        handleLogin()
                    }
                }} />
            </div>
            <div>
                <button onClick={handleLogin}>login</button>
            </div>
        </div>
    )
}

export default Login