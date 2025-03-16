import { useAppSelector } from "../../store/hooks";
import "./index.scss"

function OfflineMask() {
    const userInfo = useAppSelector(state => state.userInfo.value)
    const userOnlineState = useAppSelector(state => state.userOnlineState.value)
    // 登录后 且 连接断开时 显示 OfflineMask
    if(!userInfo) return null
    if(userOnlineState) return null

    return (
      <div id="offline-mask">
        <div className="mask"></div>
        <div className="content">
          <div>与服务器的连接已断开</div>
        </div>
      </div>
    );
}

export default OfflineMask