
import "./index.scss"
import axios from "axios"
import { BACKEND_SERVER_URL } from "../../utils/conf"
import { useAppSelector } from "../../store/hooks"

function Home() {
    const userInfo = useAppSelector((state) => state.userInfo.value)

    async function getUserList() {
        if(userInfo.token) {
            const res = await axios.get(`${BACKEND_SERVER_URL}/user/users`, {
                headers: {
                    Authorization: `Bearer ${userInfo.token}`
                }
            })

            console.log('res', res)
        }
    }
   
    return (
        <div className="home">
            <h1>home</h1>
            <div>
                <div>
                    <label>id:</label>
                    <span>{userInfo.id}</span>
                </div>
                <div>
                    <label>username:</label>
                    <span>{userInfo.name}</span>
                </div>
            </div>
            <div>
                <button onClick={getUserList}>getUserList</button>
            </div>
        </div>
    )
}

export default Home