import { Search, X } from "lucide-react";
import { useState } from "react";

function SearchBar() {
  const [searchValue, setSearchValue] = useState("");

  function handleSubmit(event) {
    event.preventDefault();

    if (!searchValue.trim()) {
      return;
    }

    console.log("Search:", searchValue);
  }

  return (
    <form
      className="input-group"
      style={{
        width: "min(340px, 100%)",
      }}
      onSubmit={handleSubmit}
    >
      <span className="input-group-text bg-white border-end-0">
        <Search size={17} className="text-secondary" />
      </span>

      <input
        type="text"
        className="form-control border-start-0 border-end-0 shadow-none"
        placeholder="Search patients, appointments..."
        value={searchValue}
        onChange={(event) => setSearchValue(event.target.value)}
      />

      <button
        type="button"
        className="input-group-text bg-white border-start-0"
        onClick={() => setSearchValue("")}
        disabled={!searchValue}
        aria-label="Clear search"
      >
        <X size={16} />
      </button>
    </form>
  );
}

export default SearchBar;