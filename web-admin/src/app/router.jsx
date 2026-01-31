import { createBrowserRouter } from "react-router-dom";
import LoginPage from "./LoginPage";
import BreedsPage from "../features/breeds/BreedsPage";
import TrainingPage from "../features/training/TrainingPage";
import NutritionPage from "../features/nutrition/NutritionPage";
import MedicalPage from "../features/medical/MedicalPage";

const router = createBrowserRouter([
  { path: "/login", element: <LoginPage /> },
  { path: "/breeds", element: <BreedsPage /> },
  { path: "/training", element: <TrainingPage /> },
  { path: "/nutrition", element: <NutritionPage /> },
  { path: "/medical", element: <MedicalPage /> },
  { path: "*", element: <LoginPage /> },
]);

export default router;
