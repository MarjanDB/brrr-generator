# Vzpostavitev repozitorija

## Kloniranje repozitorija

```bash
git clone git@github.com:MarjanDB/brrr-generator.git
```

## Vzpostavitev okolja

### Git config

Prvo kot prvo, vključi `.gitconfig` datoteko v korenju repozitorija.
To dodeli filter, ki odstrani izvoz iz zvezkov (notebooks) v repozitorij.
To ni nujno, vendar odstrani ročno čiščenje zvezkov po izvajanju.
Če dobiš napake zaradi tega ker tega ne narediš, potem odstrani filter iz `.gitattributes`.

```bash
git config --local include.path ../.gitconfig
```

### Odvisnosti

Ta okolje uporablja PipEnv, vendar bi moralo delovati s katerim koli drugim okoljem.
Navodila za te so izpuščena, ker znam uporabljati samo PipEnv.
Če želiš, lahko odpreš PR s navodili kako to narediti v drugih okoljih.

#### PipEnv

```bash
pipenv install
pipenv shell
```

## **Pogostne težave**

Ta repozitorij je bil razvitan z uporabo Visual Studio Code.
Kot rezultat, je večina konfiguracij specifična za Visual Studio Code.
Ne vem kako bo stvar delovala v drugih IDE-ah, vendar bi moralo mogla stvar delovati če upoštevaš variable v `.env` datoteki.


