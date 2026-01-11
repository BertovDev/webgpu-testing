import { BrowserRouter, Routes, Route, useNavigate } from "react-router-dom";
import Canvas1 from "./components/Canvas1";
import { useControls } from "leva";
import { useEffect } from "react";
import Canvas2 from "./components/Canvas2";
import Canvas3 from "./components/Canvas3";

function RouterContent() {
  const navigate = useNavigate();

  const { routes } = useControls({
    routes: {
      label: "Route",
      value: "/",
      options: ["/", "/points", "/compute2"],
      onChange: (value) => {
        navigate(value);
      },
    },
  });

  useEffect(() => {
    navigate(routes);
  }, [routes, navigate]);

  return (
    <Routes>
      <Route path="/" element={<Canvas1 />} />
      <Route path="/points" element={<Canvas2 />} />
      <Route path="/compute2" element={<Canvas3 />} />
    </Routes>
  );
}

function App() {
  return (
    <BrowserRouter>
      <RouterContent />
    </BrowserRouter>
  );
}

export default App;
