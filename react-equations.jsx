const { useState, useEffect } = React;

// API base URL - always use production backend
const getAPIUrl = (path) => {
  // Always use the production backend API
  return `https://circuitcraftramiassi.onrender.com${path}`;
};

function SavedEquations({ token }) {
  const [equations, setEquations] = useState([]);

  useEffect(() => {
    async function fetchEquations() {
      if (!token) {
        setEquations([]);
        return;
      }

      try {
        const res = await fetch(getAPIUrl("/api/equations"), {
            headers: { Authorization: "Bearer " + token }
          });
          

        if (!res.ok) {
          let errorMessage = "Failed to load equations";
          try {
            const errorData = await res.json();
            errorMessage = errorData.message || errorMessage;
          } catch (e) {
            errorMessage = res.statusText || errorMessage;
          }
          console.error("Error loading equations:", errorMessage);
          setEquations([]);
          return;
        }

        const data = await res.json();
        setEquations(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error("Error loading equations:", error);
        setEquations([]);
      }
    }

    fetchEquations();
  }, [token]);

  if (!token) {
    return (
      <div style={{
        marginTop: "20px",
        padding: "20px",
        background: "linear-gradient(135deg, #0b1116 0%, #1a1f2e 100%)",
        border: "1px solid #00ffcc33",
        borderRadius: "12px",
        color: "#9bded2",
        textAlign: "center",
        boxShadow: "0 4px 15px rgba(0, 255, 204, 0.1)"
      }}>
        <p style={{ margin: 0, fontSize: "1rem" }}>Please log in to view your saved equations.</p>
      </div>
    );
  }

  return (
    <div style={{
      marginTop: "20px",
      padding: "24px",
      background: "linear-gradient(135deg, #0b1116 0%, #1a1f2e 100%)",
      border: "1px solid #00ffcc55",
      borderRadius: "12px",
      boxShadow: "0 4px 20px rgba(0, 255, 204, 0.15)"
    }}>
      <h3 style={{
        color: "#00ffc3",
        marginTop: 0,
        marginBottom: "20px",
        fontSize: "1.3rem",
        fontWeight: "600",
        textShadow: "0 0 10px rgba(0, 255, 204, 0.5)"
      }}>
        📝 Your Saved Equations
      </h3>
      {equations.length === 0 ? (
        <p style={{
          color: "#9bded2",
          textAlign: "center",
          margin: "20px 0",
          fontSize: "1rem"
        }}>
          No saved equations yet. Start building!
        </p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {equations.map((eq, index) => (
            <div key={eq.id} style={{
              padding: "14px 16px",
              background: "rgba(0, 255, 204, 0.05)",
              border: "1px solid #00ffcc33",
              borderRadius: "8px",
              display: "flex",
              alignItems: "center",
              gap: "12px",
              transition: "all 0.3s ease"
            }}>
              <span style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                width: "28px",
                height: "28px",
                background: "linear-gradient(135deg, #00ffc3, #009977)",
                color: "#0d1117",
                borderRadius: "50%",
                fontSize: "0.85rem",
                fontWeight: "700",
                flexShrink: 0
              }}>
                {index + 1}
              </span>
              <span style={{
                color: "#00ffc3",
                fontSize: "1rem",
                fontFamily: "monospace",
                flex: 1,
                wordBreak: "break-word"
              }}>
                {eq.expression}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function RenderReactEquations() {
  // Always read fresh token from sessionStorage
  const token = sessionStorage.getItem("token");
  return <SavedEquations token={token} />;
}

// Store the root instance to avoid creating multiple roots
let reactRoot = null;

// Function to render React component (can be called multiple times)
function renderReactEquations() {
  try {
    const rootElement = document.getElementById("react-equations");
    if (!rootElement) {
      // Element doesn't exist yet, try again after a short delay
      setTimeout(renderReactEquations, 100);
      return;
    }
    
    // Check if React is available
    if (typeof React === 'undefined' || typeof ReactDOM === 'undefined') {
      rootElement.innerHTML = '<p style="color: #999; padding: 10px;">Loading React component...</p>';
      setTimeout(renderReactEquations, 100);
      return;
    }
    
    // Create root if it doesn't exist
    if (!reactRoot) {
      reactRoot = ReactDOM.createRoot(rootElement);
    }
    // Re-render with current token (this will update the component)
    reactRoot.render(<RenderReactEquations />);
  } catch (error) {
    const rootElement = document.getElementById("react-equations");
    if (rootElement) {
      rootElement.innerHTML = '<p style="color: #ff5555; padding: 10px;">Error loading equations component. Please refresh the page.</p>';
    }
  }
}

// Wait for React and ReactDOM to be available
function initReactComponent() {
  if (typeof React === 'undefined' || typeof ReactDOM === 'undefined') {
    // React not loaded yet, try again
    setTimeout(initReactComponent, 100);
    return;
  }

  // Wait for DOM to be ready before rendering
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      renderReactEquations();
    });
  } else {
    renderReactEquations();
  }

  // Make function globally available so it can be called after login
  window.renderReactEquations = renderReactEquations;
}

// Start initialization
initReactComponent();
