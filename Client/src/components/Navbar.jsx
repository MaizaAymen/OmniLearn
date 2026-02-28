import { Link } from "react-router";

function Navbar() {
  return (
    <div className="navbar bg-base-100 border-b border-base-300 px-4">
      <div className="flex-1">
        <Link to="/" className="text-xl font-bold text-primary">
          OmniLearn
        </Link>
      </div>
      <div className="flex-none gap-2">
        <Link to="/problems" className="btn btn-ghost btn-sm">
          Problems
        </Link>
      </div>
    </div>
  );
}

export default Navbar;
