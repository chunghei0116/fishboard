'use client';

export type AquariumFish = { id: string; name: string; image: string; sample?: boolean };
type Props = { fish: AquariumFish[]; paused: boolean; onSelect: (fish: AquariumFish) => void };

export default function Aquarium({ fish, paused, onSelect }: Props) {
  return <div className="fish-box-grid" data-paused={paused}>
    {fish.map((item, index) => <button className="fish-box-slot" key={item.id}
      onClick={() => onSelect(item)} aria-label={`查看${item.name}${item.sample ? '（示範魚）' : ''}`}>
      <img src={item.image} alt="" draggable={false} style={{ animationDelay: `${-index*.63}s` }}/>
    </button>)}
  </div>;
}
