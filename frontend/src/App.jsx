import { Navigate, Route, Routes } from "react-router";
import HomePage from "./pages/HomePage";
import SignUpPage from "./pages/SignUpPage";
import LoginPage from "./pages/LoginPage";
import Notifications from "./pages/Notifications";
import CallPage from "./pages/CallPage";
import ChatPage from "./pages/ChatPage";
import OnboardingPage from "./pages/OnboardingPage";
import { Toaster } from "react-hot-toast";
import PageLoader from "./components/PageLoader";
import useAuthUser from "./hooks/useAuthUser";
import Layout from "./components/Layout";
import { useThemeStore } from "./store/useThemeStore";

function App() {
  const { isLoading, authUser } = useAuthUser();
  const { theme } = useThemeStore();

  const isAuthenticated = Boolean(authUser);
  const isOnboarded = authUser?.isOnboarded;

  if (isLoading) {
    return <PageLoader></PageLoader>;
  }

  return (
    <div className="h-screen" data-theme={theme}>
      <Routes>
        <Route
          path="/"
          element={
            isAuthenticated && isOnboarded ? (
              <Layout showSidebar={true}>
                <HomePage></HomePage>
              </Layout>
            ) : (
              <Navigate
                to={!isAuthenticated ? "/login" : "/onboarding"}
              ></Navigate>
            )
          }
        ></Route>
        <Route
          path="/signup"
          element={
            !isAuthenticated ? (
              <SignUpPage></SignUpPage>
            ) : (
              <Navigate to={isOnboarded ? "/" : "/onboarding"}></Navigate>
            )
          }
        ></Route>
        <Route
          path="/login"
          element={
            !isAuthenticated ? (
              <LoginPage></LoginPage>
            ) : (
              <Navigate to={isOnboarded ? "/" : "/onboarding"}></Navigate>
            )
          }
        ></Route>
        <Route
          path="/notifications"
          element={
            isAuthenticated && isOnboarded ? (
              <Layout showSidebar={true}>
                <Notifications />
              </Layout>
            ) : (
              <Navigate
                to={!isAuthenticated ? "/login" : "/onboarding"}
              ></Navigate>
            )
          }
        ></Route>
        <Route
          path="/call/:id"
          element={
            isAuthenticated ? <CallPage /> : <Navigate to="/login" />
          }
        />
        <Route
          path="/chat/:id"
          element={
            isAuthenticated && isOnboarded ? (
              <Layout showSidebar={false}>
                <ChatPage />
              </Layout>
            ) : (
              <Navigate to={!isAuthenticated ? "/login" : "/onboarding"} />
            )
          }
        />
        <Route
          path="/onboarding"
          element={
            isAuthenticated ? (
              !isOnboarded ? (
                <OnboardingPage></OnboardingPage>
              ) : (
                <Navigate to="/"></Navigate>
              )
            ) : (
              <Navigate to="/login"></Navigate>
            )
          }
        ></Route>
      </Routes>

      <Toaster></Toaster>
    </div>
  );
}

export default App;
