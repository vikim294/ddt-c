import { apiGet, apiPost } from "../utils/http"

interface User {
    id: number
    name: string
}

export const getUsers = () => {
    return apiGet<User[]>(`/user/users`)
}

interface RegisterData {
    username: string
    password: string
}

export const userRegister = (data: RegisterData) => {
    return apiPost(`/user/register`, data)
}

interface LoginData extends RegisterData {}
export interface UserInfo {
    id: number
    name: string
    token: string
}
interface LoginResData {
    userInfo: UserInfo
}

export const userLogin = (data: LoginData) => {
    return apiPost<LoginResData>(`/user/login`, data)
}

interface TokenResData {
    newToken: string
}
export const getNewToken = (data: User) => {
    return apiGet<TokenResData>(`/user/newToken`, data)
}

