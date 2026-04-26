import { RouterProvider } from 'react-router-dom';
import { Toaster } from 'sonner';
import { SessionProvider } from './session';
import { ProfileProvider } from './profile';
import { ChatProvider } from '../features/chatbot/ChatContext';
import { router } from './router';

export function App() {
  return (
    <SessionProvider>
      <ProfileProvider>
        <ChatProvider>
          <RouterProvider router={router} />
          <Toaster
            position="top-right"
            richColors
            closeButton
            toastOptions={{
              className: 'rounded-xl',
            }}
          />
        </ChatProvider>
      </ProfileProvider>
    </SessionProvider>
  );
}
