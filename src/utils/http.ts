import axios from "axios"
import { BACKEND_SERVER_URL } from "./conf";
import store from "../store";
import { clearUserInfo, setUserInfo } from "../store/userInfoSlice";
import { startRequestNewTokenTimer } from "./requestNewToken";

const axiosInstance = axios.create({
    baseURL: BACKEND_SERVER_URL,
    timeout: 10000,
});

axiosInstance.interceptors.request.use((config) => {
    // react-redux store
    const token = store.getState().userInfo.value?.token
    if(token) {
        config.headers.Authorization = `Bearer ${token}`
    }
    return config
}, (err) => {
    return Promise.reject(err)
})

axiosInstance.interceptors.response.use((res) => {
    if(res.data.data && res.data.data.token) {
        // 需要保存新 token
        console.log('axios响应拦截器  newToken：', res.data.data.token)

        const data = localStorage.getItem('userInfo')
        if(data) {
            const userInfo = JSON.parse(data)
            const newUserInfo = {
                ...userInfo,
                token: res.data.data.token
            }
            // 保存到 本地存储
            localStorage.setItem('userInfo', JSON.stringify(newUserInfo))
            // 保存到 react-redux store
            store.dispatch(setUserInfo(newUserInfo))

            // 40mins后 发送更新token请求
            startRequestNewTokenTimer()
        }
    }

    return res.data
}, (err) => {
    if(err.response?.status === 401) {
        localStorage.removeItem('userInfo')
        // react-redux store
        store.dispatch(clearUserInfo())
        window.location.href = '/login'
    }

    return Promise.reject(err)
})

interface Res<T> {
    msg: string,
    data: T
}

function apiGet<T>(url: string, params: any = {}) {
    return axiosInstance.get<T, Res<T>>(url, {
        params
    })
}

function apiPost<T>(url: string, data: any = {}) {
    return axiosInstance.post<T, Res<T>>(url, data)
}

export {
    apiGet,
    apiPost
}

// 40 mins 后 请求新的 token
export const NEWTOKEN_REQUEST_MS = 40 * 60 * 1000
// export const NEWTOKEN_REQUEST_MS = 40 * 1000 // 40s 后 请求新的 token