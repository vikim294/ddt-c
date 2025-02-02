
import { useState } from "react"
import { useNavigate } from "react-router-dom";
import "./index.scss"
import axios from "axios"
import { BACKEND_SERVER_URL } from "../../utils/conf"
import { setUserInfo } from "../../store/userInfoSlice";
import { useAppDispatch } from "../../store/hooks";

function Login() {
    const navigate = useNavigate();
    const dispatch = useAppDispatch()

    const [username, setUsername] = useState('')
    const [password, setPassword] = useState('')

    async function handleLogin() {

        console.log(username, password)

        const res = await axios.post(`${BACKEND_SERVER_URL}/user/login`, {
            username,
            password
        })

        console.log(res)

        // 将 用户信息 和 token 存到本地存储，之后的请求携带token
        localStorage.setItem('userInfo', JSON.stringify(res.data.data.userInfo))

        // 存 全局状态中
        dispatch(setUserInfo(res.data.data.userInfo))

        // reset
        setUsername('')
        setPassword('')

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
                }} />
            </div>
            <div>
                <label>password:</label>
                <input type="password" value={password} onChange={(e) => {
                    setPassword(e.target.value)
                }} />
            </div>
            <div>
                <button onClick={handleLogin}>login</button>
            </div>
        </div>
    )
}

export default Login