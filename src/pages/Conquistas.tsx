import React from 'react';
import AchievementsPage from '../components/Achievements/AchievementsPage';
import { UserData } from '../types';

interface ConquistasPageProps {
  userData: UserData;
}

const ConquistasPage: React.FC<ConquistasPageProps> = ({ userData }) => {
  return (
    <div>
      <AchievementsPage userData={userData} />
    </div>
  );
};

export default ConquistasPage;
