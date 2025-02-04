
import { useEffect, useRef, useState } from "react"
import "./index.scss"
import { userLogin } from "../../api/user"

function Register() {

    const [username, setUsername] = useState('')
    const [password, setPassword] = useState('')

    async function handleRegister() {
        console.log(username, password)

        await userLogin({
            username,
            password
        })

        setUsername('')
        setPassword('')
    }

    return (
        <div className="register">
            <h1>Register</h1>
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
                <button onClick={handleRegister}>register</button>
            </div>
        </div>
    )
}

export default Register