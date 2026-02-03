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
      <div className="min-h-screen flex items-center justify-center pt-16">
        <div className="animate-pulse text-white">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-24 pb-12 px-4">
      <div className="container mx-auto max-w-6xl">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">Achievements</h1>
          <p className="text-gray-300">
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
                className={`card ${unlocked ? 'border-2 border-purple-500/50' : 'opacity-60'}`}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="text-4xl">{achievement.icon}</div>
                  <div className={`p-2 rounded-full ${unlocked ? 'bg-purple-500/20' : 'bg-gray-500/20'}`}>
                    {unlocked ? (
                      <Unlock className="w-5 h-5 text-purple-400" />
                    ) : (
                      <Lock className="w-5 h-5 text-gray-400" />
                    )}
                  </div>
                </div>

                <h3 className="text-xl font-bold text-white mb-2">{achievement.name}</h3>
                <p className="text-gray-300 text-sm mb-4">{achievement.description}</p>

                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Trophy className="w-4 h-4 text-yellow-400" />
                    <span className="text-yellow-400 font-semibold">{achievement.xp_reward} XP</span>
                  </div>
                  <span className={`text-xs px-3 py-1 rounded-full ${
                    unlocked ? 'bg-purple-500/20 text-purple-300' : 'bg-gray-500/20 text-gray-400'
                  }`}>
                    {achievement.category}
                  </span>
                </div>

                {unlocked && unlockedDate && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="mt-4 pt-4 border-t border-white/10"
                  >
                    <p className="text-gray-400 text-xs">Unlocked on {unlockedDate}</p>
                  </motion.div>
                )}
              </motion.div>
            );
          })}

          {achievements.length === 0 && (
            <div className="col-span-full text-center py-12">
              <Trophy className="w-16 h-16 text-gray-500 mx-auto mb-4" />
              <p className="text-gray-400 text-lg">No achievements available yet</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
