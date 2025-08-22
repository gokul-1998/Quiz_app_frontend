'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { LoginForm } from '@/components/auth/login-form';
import { RegisterForm } from '@/components/auth/register-form';
import { useAuth } from '@/hooks/use-auth';
import { BookOpen } from 'lucide-react';
import { apiService } from '@/lib/api';

export default function HomePage() {
  const [isLogin, setIsLogin] = useState(true);
  const { isAuthenticated } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isAuthenticated) {
      router.push('/dashboard');
    }
  }, [isAuthenticated, router]);

  // On landing, ping /auth/me if tokens exist to validate/refresh; on failure apiService will dispatch auth:expired
  useEffect(() => {
    const hasAnyToken = typeof window !== 'undefined' && (localStorage.getItem('access_token') || localStorage.getItem('refresh_token'));
    if (!hasAnyToken) return;
    apiService.getMe().then(() => {}).catch(() => {});
  }, []);

  if (isAuthenticated) {
    return null; // Show nothing while redirecting
  }

  return (
    <div className="min-h-screen bg-white dark:bg-white flex flex-col">
      {/* Hero Section */}
      <section className="flex-1 flex flex-col justify-center items-center py-24 px-4 text-center">
        <div className="flex justify-center mb-6">
          <div className="p-4 bg-gray-900 rounded-full shadow-lg">
            <BookOpen className="h-10 w-10 text-white" />
          </div>
        </div>
        <h1 className="text-4xl font-extrabold text-gray-900 dark:text-gray-900 mb-4">
          Welcome to FlashCard
        </h1>
        <p className="max-w-xl mx-auto text-lg text-gray-700 dark:text-gray-700 mb-6">
          Supercharge your learning with AI-powered flashcards. Create, study, and master any subject—smarter and faster. Join thousands of learners who use FlashCard to boost their memory and ace exams.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <button
            onClick={() => router.push('/login')}
            className="bg-gray-900 text-white px-8 py-3 rounded-lg font-semibold shadow hover:bg-violet-700 transition"
          >
            Get Started
          </button>
        </div>
      </section>
      {/* Features Section */}
      <section className="bg-white dark:bg-white py-12">
        <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
          <div>
            <h2 className="text-xl font-semibold mb-2 text-gray-900 dark:text-gray-900">AI Card Generation</h2>
            <p className="text-gray-500 dark:text-gray-500">Instantly generate flashcards from your notes or topics using AI.</p>
          </div>
          <div>
            <h2 className="text-xl font-semibold mb-2 text-gray-900 dark:text-gray-900">Personalized Decks</h2>
            <p className="text-gray-500 dark:text-gray-500">Organize your learning with custom decks for every subject.</p>
          </div>
          <div>
            <h2 className="text-xl font-semibold mb-2 text-gray-900 dark:text-gray-900">Progress Tracking</h2>
            <p className="text-gray-500 dark:text-gray-500">Monitor your mastery and get insights on your study habits.</p>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="bg-white dark:bg-white py-12">
        <div className="max-w-5xl mx-auto px-4">
          <h2 className="text-2xl font-bold text-center mb-8 text-gray-900 dark:text-gray-900">How It Works</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-white dark:bg-white rounded-lg p-6 shadow text-center">
              <span className="text-3xl">📝</span>
              <h3 className="font-semibold mt-2 mb-1">Create or Import Notes</h3>
              <p className="text-gray-500 dark:text-gray-500">Add your study materials, or import from files and text.</p>
            </div>
            <div className="bg-white dark:bg-white rounded-lg p-6 shadow text-center">
              <span className="text-3xl">🤖</span>
              <h3 className="font-semibold mt-2 mb-1">Generate Flashcards</h3>
              <p className="text-gray-500 dark:text-gray-500">Let AI turn your content into smart, effective flashcards.</p>
            </div>
            <div className="bg-white dark:bg-white rounded-lg p-6 shadow text-center">
              <span className="text-3xl">🎯</span>
              <h3 className="font-semibold mt-2 mb-1">Study & Track Progress</h3>
              <p className="text-gray-500 dark:text-gray-500">Review cards, quiz yourself, and see your improvement over time.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="bg-white dark:bg-white py-12">
        <div className="max-w-4xl mx-auto px-4">
          <h2 className="text-2xl font-bold text-center mb-8 text-gray-900 dark:text-gray-900">What Our Users Say</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="bg-white dark:bg-white rounded-lg p-6 shadow">
              <p className="italic text-gray-700 dark:text-gray-700">“FlashCard helped me ace my finals! The AI-generated cards saved me hours.”</p>
              <div className="mt-4 flex items-center">
                <span className="font-semibold text-gray-900 dark:text-gray-900">— Priya S., Student</span>
              </div>
            </div>
            <div className="bg-white dark:bg-white rounded-lg p-6 shadow">
              <p className="italic text-gray-700 dark:text-gray-700">“I use FlashCard to prep for job interviews. The spaced repetition and progress tracking are game changers.”</p>
              <div className="mt-4 flex items-center">
                <span className="font-semibold text-gray-900 dark:text-gray-900">— Alex T., Job Seeker</span>
              </div>
            </div>
            <div className="bg-white dark:bg-white rounded-lg p-6 shadow">
              <p className="italic text-gray-700 dark:text-gray-700">“As a teacher, I recommend FlashCard to my students for effective revision.”</p>
              <div className="mt-4 flex items-center">
                <span className="font-semibold text-gray-900 dark:text-gray-900">— Dr. Meera R., Teacher</span>
              </div>
            </div>
            <div className="bg-white dark:bg-white rounded-lg p-6 shadow">
              <p className="italic text-gray-700 dark:text-gray-700">“The personalized decks and easy import make learning so much easier.”</p>
              <div className="mt-4 flex items-center">
                <span className="font-semibold text-gray-900 dark:text-gray-900">— Sam K., Lifelong Learner</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-white dark:bg-white py-6 mt-8">
        <div className="max-w-4xl mx-auto px-4 flex flex-col md:flex-row justify-between items-center text-gray-900 dark:text-gray-900 text-sm">
          <span>© {new Date().getFullYear()} FlashCard. All rights reserved.</span>
          <span>Made with ❤️ for learners everywhere.</span>
        </div>
      </footer>
    </div>
  );
}