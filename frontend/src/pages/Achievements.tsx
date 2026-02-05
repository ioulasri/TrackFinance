import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Trophy, Lock, Unlock } from 'lucide-react';
import { achievementAPI } from '../api';

export default function Achievements() {
  const [achievements, setAchievements] = useState<any[]>([]);
  const [userAchievements, setUserAchievements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAchievements();
  }, []);

  const loadAchievements = async () => {
    try {
      const [allRes, userRes] = await Promise.all([
        achievementAPI.list(),
        achievementAPI.getUserAchievements(),
      ]);
      setAchievements(allRes.data);
      setUserAchievements(userRes.data);
    } catch (error) {
      console.error('Failed to load achievements:', error);
    } finally {
      setLoading(false);
    }
  };

  const isUnlocked = (achievementId: number) => {
    return userAchievements.some((ua) => ua.achievement_id === achievementId);
  };

  const getUnlockedDate = (achievementId: number) => {
    const ua = userAchievements.find((ua) => ua.achievement_id === achievementId);
    return ua ? new Date(ua.unlocked_at).toLocaleDateString() : null;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center pt-16">
        <div className="animate-pulse text-gray-600">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pt-24 pb-12 px-4">
      <div className="container mx-auto max-w-6xl">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Achievements</h1>
          <p className="text-gray-600">
            {userAchievements.length} of {achievements.length} unlocked
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {achievements.map((achievement, index) => {
            const unlocked = isUnlocked(achievement.id);
            const unlockedDate = getUnlockedDate(achievement.id);

            return (
              <motion.div
                key={achievement.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className={`card ${unlocked ? 'ring-2 ring-purple-500' : 'opacity-60'}`}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="text-4xl">{achievement.icon}</div>
                  <div className={`p-2 rounded-full ${unlocked ? 'bg-purple-100' : 'bg-gray-100'}`}>
                    {unlocked ? (
                      <Unlock className="w-5 h-5 text-purple-600" />
                    ) : (
                      <Lock className="w-5 h-5 text-gray-400" />
                    )}
                  </div>
                </div>

                <h3 className="text-xl font-bold text-gray-900 mb-2">{achievement.name}</h3>
                <p className="text-gray-600 text-sm mb-4">{achievement.description}</p>

                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Trophy className="w-4 h-4 text-amber-500" />
                    <span className="text-amber-600 font-semibold">{achievement.xp_reward} XP</span>
                  </div>
                  <span className={`text-xs px-3 py-1 rounded-full ${
                    unlocked ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-600'
                  }`}>
                    {achievement.category}
                  </span>
                </div>

                {unlocked && unlockedDate && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="mt-4 pt-4 border-t border-gray-200"
                  >
                    <p className="text-gray-500 text-xs">Unlocked on {unlockedDate}</p>
                  </motion.div>
                )}
              </motion.div>
            );
          })}

          {achievements.length === 0 && (
            <div className="col-span-full text-center py-12">
              <Trophy className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 text-lg">No achievements available yet</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
