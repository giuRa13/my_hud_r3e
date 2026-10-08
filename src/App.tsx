import Hud from './Hud';
import DesignMode from './DesignMode';
import { LayoutProvider } from './store/LayoutContext';

export default function App() {
  const design = new URLSearchParams(location.search).has("design");
  return <LayoutProvider>{design ? <DesignMode/> : <Hud/>}</LayoutProvider>;
}