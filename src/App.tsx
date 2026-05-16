/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Users, 
  Trophy, 
  History, 
  PlayCircle, 
  Settings2, 
  RotateCcw, 
  ChevronRight, 
  Clock,
  UserMinus,
  Save,
  Trash2,
  AlertCircle
} from 'lucide-react';
import { Player, Rotation, TournamentState, Match } from './types';
import { 
  createInitialRotation, 
  calculateNextRotation, 
  calculatePoints,
  ROTATION_DURATION,
  BREAK_DURATION
} from './logic/tournament';

const TABS = [
  { id: 'players', label: 'Joueurs', icon: Users },
  { id: 'matches', label: 'Matchs', icon: PlayCircle },
  { id: 'ranking', label: 'Classement', icon: Trophy },
  { id: 'history', label: 'Historique', icon: History },
];

export default function App() {
  const [activeTab, setActiveTab] = useState('players');
  const [state, setState] = useState<TournamentState>(() => {
    const saved = localStorage.getItem('padel-master-state');
    if (saved) {
      const parsed = JSON.parse(saved);
      // Migration for old state without playerCount or with old byePlayerId
      if (!parsed.playerCount) parsed.playerCount = 13;
      if (!parsed.rotationCount) parsed.rotationCount = 7;
      if (parsed.rotations) {
        parsed.rotations = parsed.rotations.map((r: any) => ({
          ...r,
          byePlayerIds: r.byePlayerIds || (r.byePlayerId ? [r.byePlayerId] : [])
        }));
      }
      return parsed;
    }
    
    const initialPlayers: Player[] = Array.from({ length: 13 }, (_, i) => ({
      id: `p${i + 1}`,
      name: `Joueur ${i + 1}`,
      points: 0,
    }));

    return {
      players: initialPlayers,
      playerCount: 13,
      rotationCount: 7,
      rotations: [],
      currentRotationIndex: -1,
      startTime: '18:00',
    };
  });

  useEffect(() => {
    localStorage.setItem('padel-master-state', JSON.stringify(state));
  }, [state]);

  const currentRotation = state.rotations[state.currentRotationIndex];
  
  const playerPoints = useMemo(() => calculatePoints(state.rotations), [state.rotations]);

  const handleStartTournament = () => {
    const firstRotation = createInitialRotation(state.players, state.startTime);
    setState(prev => ({
      ...prev,
      rotations: [firstRotation],
      currentRotationIndex: 0,
    }));
    setActiveTab('matches');
  };

  const handleUpdateScore = (matchId: string, team: 1 | 2, value: string) => {
    const score = value === '' ? null : parseInt(value, 10);
    setState(prev => {
      const newRotations = [...prev.rotations];
      const rotation = { ...newRotations[prev.currentRotationIndex] };
      rotation.matches = rotation.matches.map(m => 
        m.id === matchId ? { ...m, [team === 1 ? 'score1' : 'score2']: score } : m
      );
      newRotations[prev.currentRotationIndex] = rotation;
      return { ...prev, rotations: newRotations };
    });
  };

  const handleCompleteRotation = () => {
    if (!currentRotation) return;
    
    // Check if all scores are entered
    const allScored = currentRotation.matches.every(m => m.score1 !== null && m.score2 !== null);
    if (!allScored) {
      alert("Veuillez saisir tous les scores avant de passer à la rotation suivante.");
      return;
    }

    if (state.currentRotationIndex >= state.rotationCount - 1) {
      setState(prev => {
        const newRotations = [...prev.rotations];
        newRotations[prev.currentRotationIndex] = {
          ...newRotations[prev.currentRotationIndex],
          isCompleted: true
        };
        return { ...prev, rotations: newRotations };
      });
      setActiveTab('ranking');
      return;
    }

    try {
      const nextRotation = calculateNextRotation(
        { ...currentRotation, isCompleted: true },
        state.players,
        state.currentRotationIndex + 1
      );

      setState(prev => ({
        ...prev,
        rotations: [
          ...prev.rotations.map((r, i) => i === prev.currentRotationIndex ? { ...r, isCompleted: true } : r), 
          nextRotation
        ],
        currentRotationIndex: prev.currentRotationIndex + 1,
      }));
    } catch (error) {
      console.error("Error calculating next rotation:", error);
      alert("Une erreur est survenue lors du calcul de la rotation suivante.");
    }
  };

  const handleReset = () => {
    if (confirm("Êtes-vous sûr de vouloir réinitialiser tout le tournoi ?")) {
      const initialPlayers: Player[] = Array.from({ length: state.playerCount }, (_, i) => ({
        id: `p${i + 1}`,
        name: `Joueur ${i + 1}`,
        points: 0,
      }));
      setState({
        players: initialPlayers,
        playerCount: state.playerCount,
        rotationCount: state.rotationCount,
        rotations: [],
        currentRotationIndex: -1,
        startTime: '18:00',
      });
      setActiveTab('players');
    }
  };

  const updateRotationCount = (count: number) => {
    if (state.currentRotationIndex !== -1) {
      if (!confirm("Changer le nombre de rotations réinitialisera le tournoi en cours. Continuer ?")) return;
    }
    
    const initialPlayers: Player[] = Array.from({ length: state.playerCount }, (_, i) => ({
      id: `p${i + 1}`,
      name: `Joueur ${i + 1}`,
      points: 0,
    }));

    setState(prev => ({
      ...prev,
      players: initialPlayers,
      rotations: [],
      currentRotationIndex: -1,
      rotationCount: count,
    }));
  };

  const updatePlayerCount = (count: number) => {
    if (state.currentRotationIndex !== -1) {
      if (!confirm("Changer le nombre de joueurs réinitialisera le tournoi en cours. Continuer ?")) return;
    }
    
    const initialPlayers: Player[] = Array.from({ length: count }, (_, i) => ({
      id: `p${i + 1}`,
      name: `Joueur ${i + 1}`,
      points: 0,
    }));

    setState({
      players: initialPlayers,
      playerCount: count,
      rotations: [],
      currentRotationIndex: -1,
      startTime: '18:00',
    });
  };

  const updatePlayerName = (id: string, name: string) => {
    setState(prev => ({
      ...prev,
      players: prev.players.map(p => p.id === id ? { ...p, name } : p)
    }));
  };

  return (
    <div className="min-h-screen bg-stone-50 font-sans pb-20">
      {/* Header */}
      <header className="bg-stone-900 text-white py-8 px-6 shadow-xl">
        <div className="max-w-5xl mx-auto flex justify-between items-center">
          <div>
            <h1 className="text-4xl font-serif italic tracking-tight">Padel Master</h1>
            <p className="text-stone-400 text-sm mt-1 uppercase tracking-widest">Montante-Descendante • {state.playerCount} Joueurs • {state.rotationCount} Rotations</p>
          </div>
          <button 
            onClick={handleReset}
            className="p-2 hover:bg-white/10 rounded-full transition-colors text-stone-400 hover:text-white"
            id="reset-button"
            title="Réinitialiser"
          >
            <RotateCcw size={20} />
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-5xl mx-auto px-6 py-8">
        <AnimatePresence mode="wait">
          {activeTab === 'players' && (
            <motion.div
              key="players"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
                <div>
                  <h2 className="text-2xl font-serif italic">Configuration</h2>
                  <p className="text-stone-500 text-sm">Nombre de joueurs et noms des participants.</p>
                </div>
                
                <div className="flex flex-wrap items-center gap-4">
                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] uppercase tracking-widest text-stone-400 font-bold ml-1">Joueurs</span>
                    <div className="flex bg-white p-1 rounded-xl border border-stone-200 shadow-sm">
{Array.from({ length: 9 }, (_, i) => i + 8).map((count) => (
  <button
    key={count}
    onClick={() => updatePlayerCount(count)}
                          className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                            state.playerCount === count 
                            ? 'bg-stone-900 text-white shadow-md' 
                            : 'text-stone-400 hover:text-stone-600'
                          }`}
                        >
                          {count}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] uppercase tracking-widest text-stone-400 font-bold ml-1">Rotations</span>
                    <div className="flex bg-white p-1 rounded-xl border border-stone-200 shadow-sm">
                      {[3, 5, 7, 9, 11].map((count) => (
                        <button
                          key={count}
                          onClick={() => updateRotationCount(count)}
                          className={`px-3 py-2 rounded-lg text-sm font-bold transition-all ${
                            state.rotationCount === count 
                            ? 'bg-stone-900 text-white shadow-md' 
                            : 'text-stone-400 hover:text-stone-600'
                          }`}
                        >
                          {count}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] uppercase tracking-widest text-stone-400 font-bold ml-1">Début</span>
                    <div className="flex items-center gap-3 bg-white p-3 rounded-xl border border-stone-200 shadow-sm h-[46px]">
                      <Clock size={18} className="text-stone-400" />
                      <input 
                        type="time" 
                        value={state.startTime}
                        onChange={(e) => setState(prev => ({ ...prev, startTime: e.target.value }))}
                        className="font-mono text-sm focus:outline-none"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {state.players.map((player, idx) => (
                  <div key={player.id} className="flex items-center gap-3 bg-white p-4 rounded-2xl border border-stone-200 shadow-sm focus-within:ring-2 focus-within:ring-stone-900 transition-all">
                    <span className="font-mono text-stone-300 text-xs w-6">{idx + 1}.</span>
                    <input 
                      type="text"
                      value={player.name}
                      onChange={(e) => updatePlayerName(player.id, e.target.value)}
                      className="w-full focus:outline-none font-medium"
                      placeholder="Nom du joueur"
                    />
                  </div>
                ))}
              </div>

              <div className="flex justify-center pt-8">
                <button 
                  onClick={handleStartTournament}
                  disabled={state.currentRotationIndex !== -1}
                  className={`flex items-center gap-2 px-8 py-4 rounded-full font-bold text-lg transition-all shadow-lg ${
                    state.currentRotationIndex !== -1 
                    ? 'bg-stone-200 text-stone-400 cursor-not-allowed' 
                    : 'bg-stone-900 text-white hover:scale-105 active:scale-95'
                  }`}
                >
                  {state.currentRotationIndex !== -1 ? 'Tournoi en cours' : 'Lancer le Tournoi'}
                  <ChevronRight size={20} />
                </button>
              </div>
            </motion.div>
          )}

          {activeTab === 'matches' && (
            <motion.div
              key="matches"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-8"
            >
              {state.currentRotationIndex === -1 ? (
                <div className="text-center py-20 glass rounded-3xl">
                  <AlertCircle size={48} className="mx-auto text-stone-300 mb-4" />
                  <p className="text-stone-500">Le tournoi n'a pas encore commencé.</p>
                  <button onClick={() => setActiveTab('players')} className="mt-4 text-stone-900 font-bold underline">Aller à l'onglet Configuration</button>
                </div>
              ) : (
                <>
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                      <h2 className="text-3xl font-serif italic">Rotation {state.currentRotationIndex + 1} / {state.rotationCount}</h2>
                      <div className="flex items-center gap-2 text-stone-500 mt-1">
                        <Clock size={16} />
                        <span className="font-mono text-sm">{currentRotation.startTime}</span>
                      </div>
                    </div>
                    {(currentRotation.byePlayerIds?.length || 0) > 0 && (
                      <div className="flex flex-wrap items-center gap-3 bg-stone-100 px-4 py-2 rounded-2xl border border-stone-200">
                        <UserMinus size={18} className="text-stone-400" />
                        <span className="text-sm font-medium">Repos: </span>
                        {currentRotation.byePlayerIds?.map(id => (
                          <span key={id} className="text-xs bg-white px-2 py-1 rounded-lg border border-stone-200 text-stone-900 font-bold">
                            {state.players.find(p => p.id === id)?.name}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {[1, 2, 3].map(courtNum => {
                      const match = currentRotation.matches.find(m => m.court === courtNum);
                      if (!match) return null;
                      
                      const p1 = state.players.find(p => p.id === match.team1[0])?.name;
                      const p2 = state.players.find(p => p.id === match.team1[1])?.name;
                      const p3 = state.players.find(p => p.id === match.team2[0])?.name;
                      const p4 = state.players.find(p => p.id === match.team2[1])?.name;

                      return (
                        <div key={match.id} className="bg-white rounded-3xl border border-stone-200 shadow-sm overflow-hidden flex flex-col">
                          <div className="bg-stone-900 text-white py-3 px-6 flex justify-between items-center">
                            <span className="font-serif italic text-lg">Terrain {courtNum}</span>
                            <span className="text-[10px] uppercase tracking-widest opacity-50">
                              {courtNum === 3 ? 'Top' : courtNum === 1 ? 'Bas' : 'Milieu'}
                            </span>
                          </div>
                          
                          <div className="p-6 flex-1 flex flex-col justify-between gap-8">
                            {/* Team 1 */}
                            <div className="space-y-3">
                              <div className="text-stone-400 text-[10px] uppercase tracking-widest font-bold">Équipe A</div>
                              <div className="space-y-1">
                                <div className="font-medium text-stone-900 truncate">{p1}</div>
                                <div className="font-medium text-stone-900 truncate">{p2}</div>
                              </div>
                              <input 
                                type="number"
                                value={match.score1 ?? ''}
                                onChange={(e) => handleUpdateScore(match.id, 1, e.target.value)}
                                className="w-full bg-stone-50 border border-stone-200 rounded-xl p-3 text-center font-mono text-2xl focus:ring-2 focus:ring-stone-900 focus:outline-none"
                                placeholder="0"
                              />
                            </div>

                            <div className="flex items-center justify-center">
                              <div className="h-px bg-stone-100 w-full"></div>
                              <span className="px-4 text-stone-300 font-serif italic">vs</span>
                              <div className="h-px bg-stone-100 w-full"></div>
                            </div>

                            {/* Team 2 */}
                            <div className="space-y-3">
                              <div className="text-stone-400 text-[10px] uppercase tracking-widest font-bold">Équipe B</div>
                              <div className="space-y-1">
                                <div className="font-medium text-stone-900 truncate">{p3}</div>
                                <div className="font-medium text-stone-900 truncate">{p4}</div>
                              </div>
                              <input 
                                type="number"
                                value={match.score2 ?? ''}
                                onChange={(e) => handleUpdateScore(match.id, 2, e.target.value)}
                                className="w-full bg-stone-50 border border-stone-200 rounded-xl p-3 text-center font-mono text-2xl focus:ring-2 focus:ring-stone-900 focus:outline-none"
                                placeholder="0"
                              />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="flex justify-center pt-8">
                    <button 
                      onClick={handleCompleteRotation}
                      className="flex items-center gap-2 px-10 py-4 bg-stone-900 text-white rounded-full font-bold text-lg hover:scale-105 active:scale-95 transition-all shadow-xl"
                    >
                      Valider la Rotation
                      <ChevronRight size={20} />
                    </button>
                  </div>
                </>
              )}
            </motion.div>
          )}

          {activeTab === 'ranking' && (
            <motion.div
              key="ranking"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              <div className="flex justify-between items-end">
                <div>
                  <h2 className="text-3xl font-serif italic">Classement Individuel</h2>
                  <p className="text-stone-500 text-sm">Basé sur la différence de score cumulée.</p>
                </div>
              </div>

              <div className="bg-white rounded-3xl border border-stone-200 shadow-xl overflow-hidden">
                <table className="w-full text-left">
                  <thead className="bg-stone-900 text-white">
                    <tr>
                      <th className="px-6 py-4 font-serif italic font-normal">Pos.</th>
                      <th className="px-6 py-4 font-serif italic font-normal">Joueur</th>
                      <th className="px-6 py-4 font-serif italic font-normal text-right">Points (Diff)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {[...state.players]
                      .sort((a, b) => (playerPoints[b.id] || 0) - (playerPoints[a.id] || 0))
                      .map((player, idx) => {
                        const points = playerPoints[player.id] || 0;
                        return (
                          <tr key={player.id} className="hover:bg-stone-50 transition-colors">
                            <td className="px-6 py-4">
                              <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full font-mono text-sm ${
                                idx === 0 ? 'bg-yellow-100 text-yellow-700' :
                                idx === 1 ? 'bg-stone-200 text-stone-700' :
                                idx === 2 ? 'bg-orange-100 text-orange-700' :
                                'text-stone-400'
                              }`}>
                                {idx + 1}
                              </span>
                            </td>
                            <td className="px-6 py-4 font-medium text-stone-900">{player.name}</td>
                            <td className={`px-6 py-4 text-right font-mono font-bold ${points > 0 ? 'text-emerald-600' : points < 0 ? 'text-rose-600' : 'text-stone-400'}`}>
                              {points > 0 ? `+${points}` : points}
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            </motion.div>
          )}

          {activeTab === 'history' && (
            <motion.div
              key="history"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-8"
            >
              <div>
                <h2 className="text-3xl font-serif italic">Historique des Rotations</h2>
                <p className="text-stone-500 text-sm">Archives des matchs passés.</p>
              </div>

              {state.rotations.length === 0 ? (
                <div className="text-center py-20 glass rounded-3xl">
                  <History size={48} className="mx-auto text-stone-300 mb-4" />
                  <p className="text-stone-500">Aucune rotation enregistrée.</p>
                </div>
              ) : (
                <div className="space-y-12">
                  {state.rotations.map((rotation, rIdx) => (
                    <div key={rotation.id} className="space-y-4">
                      <div className="flex items-center gap-4">
                        <h3 className="text-xl font-serif italic">Rotation {rIdx + 1}</h3>
                        <div className="h-px bg-stone-200 flex-1"></div>
                        <span className="font-mono text-xs text-stone-400">{rotation.startTime}</span>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {rotation.matches.map(match => (
                          <div key={match.id} className="bg-white p-4 rounded-2xl border border-stone-200 shadow-sm">
                            <div className="text-[10px] uppercase tracking-widest text-stone-400 mb-3">Terrain {match.court}</div>
                            <div className="flex justify-between items-center text-sm">
                              <div className="flex-1">
                                <div className="truncate">{state.players.find(p => p.id === match.team1[0])?.name}</div>
                                <div className="truncate">{state.players.find(p => p.id === match.team1[1])?.name}</div>
                              </div>
                              <div className="px-4 font-mono font-bold text-lg">
                                {match.score1 ?? '-'}:{match.score2 ?? '-'}
                              </div>
                              <div className="flex-1 text-right">
                                <div className="truncate">{state.players.find(p => p.id === match.team2[0])?.name}</div>
                                <div className="truncate">{state.players.find(p => p.id === match.team2[1])?.name}</div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Navigation Bar */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-stone-200 px-6 py-3 shadow-[0_-4px_20px_rgba(0,0,0,0.05)] z-50">
        <div className="max-w-xl mx-auto flex justify-between items-center">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex flex-col items-center gap-1 transition-all ${
                activeTab === tab.id ? 'text-stone-900 scale-110' : 'text-stone-400 hover:text-stone-600'
              }`}
            >
              <tab.icon size={20} strokeWidth={activeTab === tab.id ? 2.5 : 2} />
              <span className="text-[10px] font-bold uppercase tracking-tighter">{tab.label}</span>
              {activeTab === tab.id && (
                <motion.div 
                  layoutId="activeTab"
                  className="w-1 h-1 bg-stone-900 rounded-full mt-0.5"
                />
              )}
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
}
