
import { MenuBar } from "./MenuBar";
import { MainHeader } from "./MainHeader";
import { TopBar } from "./TopBar";

export const Header = () => {

    return (
        <header>
            <TopBar />

            <MainHeader />

            <MenuBar />
        </header>
    );
};
