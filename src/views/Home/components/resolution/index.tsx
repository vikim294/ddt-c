import { useAppDispatch, useAppSelector } from "../../../../store/hooks"
import { resolutionOptions, setResolution } from "../../../../store/resolutionSlice"

function ResolutionSelect() {
    const resolution = useAppSelector((state) => state.resolution.value)
    const dispatch = useAppDispatch()

    const handleResChange = (id: string) => {
        console.log('handleResChange', id)
        // 存 store
        dispatch(setResolution(id))
        // 存 本地
        localStorage.setItem('resolution', id)
    }

    return (
        <select value={resolution.id} onChange={(e)=>{
            handleResChange(e.target.value)
        }}>
            {
                resolutionOptions.map(item => <option value={item.id} key={item.id}>
                    {item.width} x {item.height}
                </option>)
            }
        </select>
    )
}

export default ResolutionSelect