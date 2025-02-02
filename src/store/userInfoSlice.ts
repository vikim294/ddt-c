import { createSlice, PayloadAction } from '@reduxjs/toolkit'

const getUserInfoFromLocalStorage = () => {
    const data = localStorage.getItem('userInfo')
    if(!data) return {}
    return JSON.parse(data)
}

// 定义state的类型
interface UserInfo {
    id: number
    name: string
    token: string
}

// 初始值
const initialValue: UserInfo = getUserInfoFromLocalStorage()

const userInfoSlice = createSlice({
  name: 'userInfo',
  initialState: {
    value: initialValue
  },
  reducers: {
    // 指定 payload的类型
    setUserInfo: (state, action: PayloadAction<UserInfo>) => {
      // Redux Toolkit allows us to write "mutating" logic in reducers. It
      // doesn't actually mutate the state because it uses the Immer library.
      // Also, no return statement is required from these functions.
      state.value = action.payload
    },
  },
})

// Export the action creators
export const { setUserInfo } = userInfoSlice.actions

// Export the slice reducer 
export default userInfoSlice.reducer