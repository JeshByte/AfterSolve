import React, { useState, useEffect } from "react";
import Select from "react-select";
import axios from "axios";
import { TailSpin } from 'react-loader-spinner';
import cfLogo from "./images/codeforces-icon.png";
import linkedinLogo from "./images/linkedin-icon.svg";
import githubLogo from "./images/github-icon.svg";
import "@fontsource/raleway/400.css";
import "@fontsource/raleway/700.css";

const API_BASE = process.env.REACT_APP_BACK_URL || "";
const api = axios.create({
  baseURL: API_BASE,
  headers: { "Content-Type": "application/json" },
  withCredentials: true
});

const COLORS = {
  border: "#CBD2D9",
  background: "#FFF",
  text: "#6B7280",
  headerBg: "#354649",
  headerText: "#E0E7E9",
  altRowBg: "#E0E7E9",
  thBg: "#fafbfc",
  thBorder: "#ddd",
  tdBorder: "#eee",
  overlayBg: "rgba(0,0,0,0.3)",
  lightShadow: "0 1px 2px rgba(0,0,0,0.05)",
  darkShadow: "0 4px 12px rgba(0,0,0,0.15)",
  optionHoverBg: "#f0f4f8",
  optionSelectedBg: "#e0e7e9"
};

export default function App() {
  // persist CF handle in localStorage
  const [handle, setHandle] = useState(
    () => localStorage.getItem("cfHandle") || ""
  );
  const [isLoading, setIsLoading] = useState(false);
  const [problems, setProblems] = useState([]);
  const [error, setError] = useState("");

  // filters and toggles
  const [selectedRating, setSelectedRating] = useState(null);
  const [selectedSort, setSelectedSort] = useState(null);
  const [selectedTime, setSelectedTime] = useState(null);
  const [selectedTags, setSelectedTags] = useState([]);
  const [showRating, setShowRating] = useState(true);
  const [showContest, setShowContest] = useState(true);
  const [showTags, setShowTags] = useState(true);
  const [showStatus, setShowStatus] = useState(true);
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const toggleStates = [showRating, showContest, showTags, showStatus];
  const checkedCount = toggleStates.filter(Boolean).length;

  const problemStatus = {
    OK:                      "AC",
    WRONG_ANSWER:            "WA",
    TIME_LIMIT_EXCEEDED:     "TLE",
    MEMORY_LIMIT_EXCEEDED:   "MLE",
    COMPILATION_ERROR:       "Compilation Error",
    RUNTIME_ERROR:           "Runtime Error",
    PRESENTATION_ERROR:      "PE",
    PARTIAL:                 "PA",
    CHALLENGED:              "Challenged",
    TESTING:                 "Testing",
    SKIPPED:                 "Skipped",
    IDLENESS_LIMIT_EXCEEDED: "ILE",
    SECURITY_VIOLATED:       "Security Violated",
    OUTPUT_LIMIT_EXCEEDED:   "OLE",
    INPUT_PREPARATION_ERROR: "IPE",
    REJECTED:                "Rejected",
    HACKED:                  "Hacked",
    CRASHED:                 "Crashed"
  };

  // filter dropdown options 
  const ratingOptions = Array.from(
    { length: (3500 - 800) / 100 + 1 },
    (_, i) => ({ value: 800 + i * 100, label: `<= ${800 + i * 100}` })
  );
  const sortOptions = [
    { value: "Increasing", label: "Increasing" },
    { value: "Decreasing", label: "Decreasing" }
  ];
  const timeOptions = [
    { value: "Oldest First", label: "Oldest First" },
    { value: "Latest First", label: "Latest First" }
  ];
  const tagOptions = [
    "2-sat","binary search","bitmasks","brute force","combinatorics",
    "constructive algorithms","data structures","dfs and similar",
    "divide and conquer","dp","dsu","flows","fft","games","geometry",
    "graphs","greedy","hashing","implementation","interactive",
    "matrix exponentiation","meet-in-the-middle","math","number theory",
    "probabilities","shortest paths","sortings","strings","ternary search",
    "two pointers","trees"
  ].map(t => ({ label: t, value: t }));
  const itemsPerPageOptions = [10,20,30,40,50].map(n => ({
    value: n, label: `${n}`
  }));

  const selectStyles = {
    control: base => ({
      ...base,
      border: `1px solid ${COLORS.border}`,
      background: COLORS.background,
      borderRadius: "0.375rem",
      boxShadow: COLORS.lightShadow,
      cursor: "pointer"
    }),
    option: (base, state) => ({
      ...base,
      color: COLORS.text,
      backgroundColor: state.isFocused
        ? COLORS.optionHoverBg
        : state.isSelected
          ? COLORS.optionSelectedBg
          : COLORS.background
    }),
    menuList: base => ({ ...base, maxHeight: 200 }),
    singleValue: base => ({ ...base, color: COLORS.text })
  };

  // save handle to localStorage
  useEffect(() => {
    localStorage.setItem("cfHandle", handle);
  }, [handle]);

  // auto-fetch if handle exists
  useEffect(() => {
    if (handle) fetchProblems();
  }, []);

  // verify handle
  const fetchUserInfo = async () => {
    const res = await axios.get(
      `https://codeforces.com/api/user.info?handles=${handle}`
    );
    const user = res.data.result[0];
    setHandle(user.handle);
  };

  // get unsolved problems and handle errors
  const fetchProblems = async () => {
    setError("");
    setIsLoading(true);

    // validate handle
    try {
      await fetchUserInfo();
    } catch {
      setError("User not found.");
      setIsLoading(false);
      setProblems([]);
      return;
    }

    // fetching problems
    try {
      const { data } = await api.get(`/api/user/${handle}/unsolved`);
      const contestsRes = await axios.get(
        "https://codeforces.com/api/contest.list?gym=false"
      );
      const startMap = contestsRes.data.result.reduce((m, c) => {
        m[c.id] = c.startTimeSeconds;
        return m;
      }, {});
      const updated = data.unsolved.map(p => ({
        ...p,
        time: startMap[p.contestId] || 0
      }));
      setProblems(updated);
    } catch (err) {
      setError(err.response?.data?.error || "Server error. Please wait and try again in a few seconds.");
      setProblems([]);
    } finally {
      setIsLoading(false);
    }
  };

  // apply filters
  const tagVals = selectedTags.map(t => t.value);
  let filtered = problems
    .filter(p => !selectedRating || p.rating <= selectedRating.value)
    .filter(p => !tagVals.length || p.tags.some(t => tagVals.includes(t)));

  // apply sorting
  if (selectedTime || selectedSort) {
    filtered = [...filtered].sort((a, b) => {
      if (selectedTime && selectedSort) {
        const dirT = selectedTime.value === "Oldest First" ? 1 : -1;
        const dT = (a.time || 0) - (b.time || 0);
        if (dT) return dirT * dT;
        const dirR = selectedSort.value === "Increasing" ? 1 : -1;
        return dirR * ((a.rating || 0) - (b.rating || 0));
      }
      if (selectedTime) {
        const dirT = selectedTime.value === "Oldest First" ? 1 : -1;
        const dT = (a.time || 0) - (b.time || 0);
        if (dT) return dirT * dT;
        return (a.rating || 0) - (b.rating || 0);
      }
      const dirR = selectedSort.value === "Increasing" ? 1 : -1;
      return dirR * ((a.rating || 0) - (b.rating || 0));
    });
  }

  // page logic
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const totalItems = filtered.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, totalItems);
  const pageData = filtered.slice(startIndex, endIndex);

  // styles
  const tagStyle = {
    display: "inline-block",
    border: `1px solid ${COLORS.border}`,
    background: COLORS.background,
    borderRadius: "0.375rem",
    padding: "0.25rem 0.5rem",
    fontSize: "0.87rem",
    color: COLORS.text,
    margin: "2px"
  };
  const gearBtn = {
    width: 44, height: 44,
    display: "flex", alignItems: "center", justifyContent: "center",
    fontSize: "1.2rem", border: `1px solid ${COLORS.border}`,
    background: COLORS.background, borderRadius: "0.375rem",
    boxShadow: COLORS.lightShadow, cursor: "pointer"
  };
  const pageBtnBase = {
    minWidth: 32, padding: "6px 8px",
    border: "1px solid #ccc", background: "#fff",
    textAlign: "center", cursor: "pointer",
    userSelect: "none", borderRadius: 4
  };
  const disabledBtn = {
    ...pageBtnBase,
    color: COLORS.headerBg,
    borderColor: "#eee",
    cursor: "default"
  };
  const renderBtn = (label, page, disabled) => (
    <div
      key={label}
      style={disabled ? disabledBtn : pageBtnBase}
      onClick={() => !disabled && setCurrentPage(page)}
    >
      {label}
    </div>
  );

  return (
    <div style={{
      fontFamily: "Raleway", minHeight: "100vh",
      display: "flex", flexDirection: "column"
    }}>
      {/* Header */}
      <header style={{
        background: COLORS.headerBg,
        color: COLORS.headerText,
        padding: "16px 32px",
        display: "flex", justifyContent: "space-between", alignItems: "center"
      }}>
        <h1
        style={{ margin: 0, fontWeight: 700, cursor: 'pointer' }}
        onClick={fetchProblems}
        >
        AfterSolve.
        </h1>
        <div>
          <input
            placeholder="Username here"
            value={handle}
            onChange={e => setHandle(e.target.value)}
            onKeyPress={e => e.key === "Enter" && fetchProblems()}
            // disable handle spell checking
            spellCheck={false}        
            autoComplete="off"       
            autoCorrect="off"         
            autoCapitalize="none"     
            style={{
              fontFamily: "Raleway, sans-serif",
              padding: "0.5rem 1rem",
              borderRadius: "24px",
              border: `1px solid ${COLORS.border}`,
              outline: "none",
              background: COLORS.background,
              color: COLORS.text,
              width: `${Math.max(handle.length, 23)}ch`
            }}
          />

          {/* refresh button */}
         <button
             type="button"
             onClick={fetchProblems}
             disabled={isLoading}
             style={
              {
                fontFamily: "Raleway",
                marginLeft: 12,
                padding: "0.5rem 1.2rem",
                borderRadius: 4,
                border: `1.6px solid ${COLORS.border}`,
                background: COLORS.headerBg,
                color: COLORS.headerText,
                cursor: isLoading ? "not-allowed" : "pointer" }
            }>
      {isLoading ? "Refresh" : "Refresh"}
    </button>
        </div>
      </header>

      {/* filters */}
      <div style={{
        fontSize: "0.85rem",
        display: "flex", flexWrap: "wrap", gap: 16,
        padding: "24px", maxWidth: 1000, margin: "0 auto",
        alignItems: "center"
      }}>
        {[
          { opts: ratingOptions, val: selectedRating, cb: setSelectedRating, ph: "Max Rating" },
          { opts: sortOptions,    val: selectedSort,   cb: setSelectedSort,   ph: "Sort" },
          { opts: timeOptions,    val: selectedTime,   cb: setSelectedTime,   ph: "Time" }
        ].map((f, i) => (
          <div key={i} style={{ flex: "1 1 220px", minWidth: 220 }}>
            <Select
              options={f.opts}
              value={f.val}
              onChange={f.cb}
              placeholder={f.ph}
              isClearable
              styles={selectStyles}
            />
          </div>
        ))}
        <div style={{ flex: "1 1 220px", minWidth: 220 }}>
          <Select
            options={tagOptions}
            isMulti
            value={selectedTags}
            onChange={setSelectedTags}
            placeholder="Tags"
            isClearable
            styles={{
              ...selectStyles,
              valueContainer: base => ({
                ...base, flexWrap: "wrap", maxHeight: "4em", overflowY: "auto"
              }),
              multiValue: base => ({ ...base, margin: "2px" }),
              input: base => ({ ...base, width: "auto" })
            }}
          />
        </div>
        <button style={gearBtn} onClick={() => setIsConfigOpen(true)}>⚙</button>
      </div>

      {/* main body */}
      <div style={{ flexGrow: 1, padding: "0 20px", textAlign: "center" }}>
        {!handle && !isLoading ? (
          <div style={{ padding: "20px", fontSize: "1rem" }}>
            Please enter your Codeforces username to continue.
          </div>
        ) : isLoading ? (
          <div style={{ padding: "20px", fontSize: "1rem" }}>
            <TailSpin
              leftmargin = "100000px"
              height={50}
              width={50}
              color="#879898"
              ariaLabel="loading"
              wrapperStyle={{
                position: 'fixed',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)'
              }}
            />
            Fetching problems, Please Wait...
          </div>
        ) : error ? (
          <div style={{ padding: "20px", fontSize: "1rem" }}>
            {error}
          </div>
        ) : pageData.length > 0 ? (
          <div style={{ overflowX: "auto" }}>
            <table style={{
              width: "100%", borderCollapse: "collapse", tableLayout: "fixed"
            }}>
              <thead>
                <tr>
                  {[
                    { key: "Index",   show: true        },
                    { key: "Problem", show: true        },
                    { key: "Rating",  show: showRating  },
                    { key: "Contest", show: showContest },
                    { key: "Tags",    show: showTags    },
                    { key: "Status",   show: showStatus   }
                  ].filter(c => c.show).map((c, idx) => (
                    <th key={c.key} style={{
                      padding: 12,
                      background: COLORS.thBg,
                      textAlign: idx === 0 ? "left" : "center",
                      borderBottom: `1px solid ${COLORS.thBorder}`
                    }}>
                      {c.key}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {pageData.map((p, i) => (
                  <tr key={startIndex + i} style={{
                    background: i % 2 ? COLORS.background : COLORS.altRowBg
                  }}>
                    {[
                      { key: "Index",   content: startIndex + i + 1 },
                      {
                        key: "Problem",
                        content: (
                          <a
                            href={`https://codeforces.com/contest/${p.contestId}/problem/${p.index}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ color: COLORS.headerBg, textDecoration: "none" }}
                          >
                            {p.rating == null ? "*" : ""}{p.name}
                          </a>
                        )
                      },
                      {
                        key: "Rating",
                        content: (
                          <span style={tagStyle}>
                            {p.rating != null ? p.rating : "tbd"}
                          </span>
                        )
                      },
                      {
                        key: "Contest",
                        content: (
                          <a
                            href={`https://codeforces.com/contest/${p.contestId}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ color: COLORS.headerBg, textDecoration: "none" }}
                          >
                            {p.contestName || p.contestId}
                          </a>
                        )
                      },
                      {
                        key: "Tags",
                        content: p.tags.map(t => (
                          <span key={t} style={tagStyle}>{t}</span>
                        ))
                      },
                      { key: "Status", content: (
                        <span style={{
                          ...tagStyle,
                        }}>
                           {problemStatus[p.status] || p.status}
                        </span>
                      ) 
                    }
                    ]
                      .filter((_, idx) => [true, true, showRating, showContest, showTags, showStatus][idx])
                      .map((c, idx) => (
                        <td key={c.key} style={{
                          padding: 12,
                          borderBottom: `1px solid ${COLORS.tdBorder}`,
                          textAlign: idx === 0 ? "left" : "center",
                          whiteSpace: ["Contest","Tags","Problem"].includes(c.key) ? "normal" : "nowrap",
                          overflow: ["Contest","Tags","Problem"].includes(c.key) ? "visible" : "hidden"
                        }}>
                          {c.content}
                        </td>
                      ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div style={{ padding: "20px", fontSize: "1rem" }}>
            You have solved every problem in this category.
          </div>
        )}
      </div>

      {/* config modal */}
      <div
        style={{
          position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
          background: COLORS.overlayBg,
          opacity: isConfigOpen ? 1 : 0,
          visibility: isConfigOpen ? "visible" : "hidden",
          transition: "opacity 200ms ease, visibility 200ms ease",
          zIndex: 1000
        }}
        onClick={() => setIsConfigOpen(false)}
      />
      <div
        style={{
          position: "fixed", top: "50%", left: "50%",
          transform: isConfigOpen
            ? "translate(-50%,-50%) scale(1)"
            : "translate(-50%,-50%) scale(0.8)",
          opacity: isConfigOpen ? 1 : 0,
          visibility: isConfigOpen ? "visible" : "hidden",
          pointerEvents: isConfigOpen ? "auto" : "none",
          transition: "opacity 200ms ease, transform 200ms ease, visibility 200ms ease",
          background: COLORS.background, borderRadius: 8, padding: 24,
          minWidth: 280, zIndex: 1001, boxShadow: COLORS.darkShadow
        }}
        onClick={e => e.stopPropagation()}
      >
        <button
          style={{
            position: "absolute", top: 8, right: 8, border: "none",
            background: "none", fontSize: 20, cursor: "pointer"
          }}
          onClick={() => setIsConfigOpen(false)}
        >×</button>
        <h2 style={{ marginTop: 0 }}>Show Columns</h2>
        {[
          ["Rating",  showRating,  () => setShowRating(!showRating)],
          ["Contest", showContest, () => setShowContest(!showContest)],
          ["Tags",    showTags,    () => setShowTags(!showTags)],
          ["Status",   showStatus,   () => setShowStatus(!showStatus)]
        ].map(([label, val, cb]) => (
          <label key={label} style={{
            display: "flex", justifyContent: "space-between",
            alignItems: "center", margin: "12px 0", fontSize: "1rem"
          }}>
            {label}
            <input
              type="checkbox"
              checked={val}
              onChange={cb}
              disabled={checkedCount === 1 && val}
              style={{ accentColor: "#47978c", opacity: checkedCount === 1 && val ? 0.7 : 1 }}
            />
          </label>
        ))}
      </div>

      {/* bottom row */}
      <div style={{
        display: "flex", justifyContent: "space-between",
        alignItems: "center", padding: "0 24px", marginTop: 16
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div>
            Problems: {pageData.length === 0 ? 0 : startIndex + 1} – {endIndex} of {totalItems}
          </div>
          <Select
            options={itemsPerPageOptions}
            value={itemsPerPageOptions.find(opt => opt.value === itemsPerPage)}
            onChange={opt => { setItemsPerPage(opt.value); setCurrentPage(1); }}
            styles={selectStyles}
            isSearchable={false}
            menuPlacement="top"
          />
        </div>
        <div style={{ display: "flex", alignItems: "center" }}>
          {renderBtn("‹", currentPage - 1, currentPage === 1)}
          <div style={{ margin: "0 12px", fontSize: "1rem", color: COLORS.headerBg }}>
            {currentPage}/{totalPages}
          </div>
          {renderBtn("›", currentPage + 1, currentPage === totalPages)}
        </div>
      </div>

      {/* footer */}
      <footer style={{
        background: "#879898",
        borderTop: `1px solid ${COLORS.border}`,
        padding: "1rem 1rem",
        marginTop: "14px"
      }}>
        <div style={{
          maxWidth: 1000,
          margin: "0 auto",
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "space-evenly",
          alignItems: "flex-start",
          gap: "2rem"
        }}>
          <div style={{ opacity: "0.85", flex: "1 1 200px", textAlign: "center", color: COLORS.headerText }}>
            <h3 style={{ marginBottom: "0.5rem", color: COLORS.background }}>About</h3>
            <p>Your one-stop platform for revisiting and upsolving problems from every contest you have participated in.</p>
          </div>
          <div style={{ opacity: "0.85", flex: "1 1 200px", textAlign: "center", color: COLORS.headerText }}>
            <h3 style={{ marginBottom: "0.5rem", color: COLORS.background }}>Supported Platforms</h3>
            <div style={{ display: "flex", justifyContent: "center", gap: "1rem", alignItems: "center" }}>
              <img src={cfLogo} alt="Codeforces" style={{ marginTop: 7, width: "133.33px", height: "15.73px" }}/>
            </div>
          </div>
          <div style={{ opacity: "0.85", flex: "1 1 200px", textAlign: "center", color: COLORS.headerText }}>
            <h3 style={{ marginBottom: "0.5rem", color: COLORS.background }}>Connect with Us</h3>
            <ul style={{
              fontSize: "0.85rem",
              listStyle: "none",
              padding: 0,
              marginLeft: 85,
              display: "flex",
              flexDirection: "column",
              gap: "0.5rem"
            }}>
              <li style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <img src={linkedinLogo} alt="LinkedIn" style={{ width: 15, height: 15 }}/>
                <a href="https://www.linkedin.com/in/pandadinesh/" target="_blank" rel="noopener noreferrer"
                   style={{ color: COLORS.headerText, textDecoration: "none" }}>
                  Dinesh Panda
                </a>
              </li>
              <li style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <img src={linkedinLogo} alt="LinkedIn" style={{ width: 15, height: 15 }}/>
                <a href="https://www.linkedin.com/in/biswasprajesh/" target="_blank" rel="noopener noreferrer"
                   style={{ color: COLORS.headerText, textDecoration: "none" }}>
                  Prajesh Biswas
                </a>
              </li>
              <li style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <img src={githubLogo} alt="GitHub" style={{ width: 15, height: 15 }}/>
                <a href="https://github.com/zWyrm/AfterSolve" target="_blank" rel="noopener noreferrer"
                   style={{ color: COLORS.headerText, textDecoration: "none" }}>
                  Source Code
                </a>
              </li>
            </ul>
          </div>
        </div>
        <div style={{ textAlign: "center", marginTop: "1.5rem", color: COLORS.headerText }}>
          © 2025 AfterSolve. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
