import { Link } from "react-router-dom"

function NotFound() {
    return (
        <div className="id">
            <div>404</div>
            <Link to="/">Home</Link>
        </div>
    )
}

export default NotFound