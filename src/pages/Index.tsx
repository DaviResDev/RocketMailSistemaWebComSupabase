
import { Navigate } from 'react-router-dom';

const Index = () => {
  // Redirect to dashboard when accessing root path
  return <Navigate to="/dashboard" replace />;
};

export default Index;
