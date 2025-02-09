import { getNewToken } from "../api/user"
import store from "../store"
import { setUpdateTokenTimer } from "../store/updateTokenTimerSlice"
import { setUserInfo } from "../store/userInfoSlice"
import { NEWTOKEN_REQUEST_MS } from "./http"

function requestNewToken() {
    const updateTokenTimerId = store.getState().updateTokenTimer.value
    const userInfo = store.getState().userInfo.value

    if(!userInfo) {
        return
    }

    // console.log('40mins后 发送更新token请求')

    // 40mins后 发送更新token请求
    if (updateTokenTimerId) {
        // console.log('old updateTokenTimerId', updateTokenTimerId)
        clearTimeout(updateTokenTimerId)
    }
    const timerId = setTimeout(async () => {
        // console.log('updateTokenTimer over', timerId)

        const { data: { newToken } } = await getNewToken({
            id: userInfo.id,
            name: userInfo.name
        })

        console.log('requestNewToken newToken：', newToken)

        // 将 token 存储
        const newUserInfo = {
            ...userInfo,
            token: newToken
        }

        // 存 本地存储
        localStorage.setItem('userInfo', JSON.stringify(newUserInfo))

        // 存 全局状态中
        store.dispatch(setUserInfo(newUserInfo))

        requestNewToken()
    }, NEWTOKEN_REQUEST_MS)
    store.dispatch(setUpdateTokenTimer(timerId))
}

export {
    requestNewToken
}