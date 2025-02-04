import axios from "axios"
import { BACKEND_SERVER_URL } from "./conf";
import store from "../store";
import { clearUserInfo } from "../store/userInfoSlice";

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