import React from 'react';
import AchievementsPage from '../components/Achievements/AchievementsPage';
import { UserData } from '../types';

interface ConquistasPageProps {
  userData: UserData;
  storageScope: string;
  weeklyGoalMinutes: number;
}

const ConquistasPage: React.FC<ConquistasPageProps> = ({ userData, storageScope, weeklyGoalMinutes }) => {
  return (
    <div>
      <AchievementsPage
        userData={userData}
        storageScope={storageScope}
        weeklyGoalMinutes={weeklyGoalMinutes}
      />
    </div>
  );
};

export default ConquistasPage;
