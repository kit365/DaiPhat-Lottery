import "./App.css";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { Login } from "./client/pages/login";
import { Register } from "./client/pages/register";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;