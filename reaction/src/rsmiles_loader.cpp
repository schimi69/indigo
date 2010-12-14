/****************************************************************************
 * Copyright (C) 2009-2010 GGA Software Services LLC
 * 
 * This file is part of Indigo toolkit.
 * 
 * This file may be distributed and/or modified under the terms of the
 * GNU General Public License version 3 as published by the Free Software
 * Foundation and appearing in the file LICENSE.GPL included in the
 * packaging of this file.
 * 
 * This file is provided AS IS with NO WARRANTY OF ANY KIND, INCLUDING THE
 * WARRANTY OF DESIGN, MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE.
 ***************************************************************************/

#include "reaction/rsmiles_loader.h"
#include "base_cpp/scanner.h"
#include "molecule/smiles_loader.h"
#include "molecule/molecule_decomposer.h"
#include "reaction/base_reaction.h"
#include "reaction/reaction.h"
#include "reaction/query_reaction.h"
#include "molecule/molecule.h"
#include "molecule/query_molecule.h"
#include "reaction/reaction_highlighting.h"
#include "molecule/elements.h"

using namespace indigo;

RSmilesLoader::RSmilesLoader (Scanner &scanner) : _scanner(scanner)
{
   highlighting = 0;
   ignore_closing_bond_direction_mismatch = false;
}

int RSmilesLoader::_selectGroupByPair (int &lead_idx, int& idx, int rcnt, int ccnt, int pcnt) const
{
   if (lead_idx < rcnt)                      
      return 0;
   lead_idx -= rcnt;
   idx -= rcnt;                      
   if (lead_idx < ccnt)                   
      return 1;
   lead_idx -= ccnt;
   idx -= ccnt;
   if (lead_idx < pcnt)                
      return 2;
   throw Error("RSmilesLoader::_selectGroup(): Index out of range");   
}

int RSmilesLoader::_selectGroup (int& idx, int rcnt, int ccnt, int pcnt) const
{
   int iidx = idx;
   return _selectGroupByPair(iidx, idx, rcnt, ccnt, pcnt);
}

void RSmilesLoader::loadReaction (Reaction &reaction)
{
   _rxn = &reaction;
   _brxn = &reaction;
   _qrxn = 0;
   _loadReaction();
}

void RSmilesLoader::loadQueryReaction (QueryReaction& rxn)
{
   _rxn = 0;
   _brxn = &rxn;
   _qrxn = &rxn;
   _loadReaction();
}

void RSmilesLoader::_loadReaction ()
{
   _brxn->clear();

   int i;

   AutoPtr<BaseMolecule> rcnt;
   AutoPtr<BaseMolecule> ctlt;
   AutoPtr<BaseMolecule> prod;

   AutoPtr<BaseMolecule> *mols[] = {&rcnt, &ctlt, &prod};

   QS_DEF(Array<int>, rcnt_aam);
   QS_DEF(Array<int>, ctlt_aam);
   QS_DEF(Array<int>, prod_aam);
   QS_DEF(Array<char>, buf);
   Array<int> *aams[] = {&rcnt_aam, &ctlt_aam, &prod_aam};

   // read the reactants
   buf.clear();
   while (1)
   {
      char c = _scanner.readChar();

      if (c == '>')
         break;
      buf.push(c);
   }

   BufferScanner r_scanner(buf);
   SmilesLoader r_loader(r_scanner);

   r_loader.ignore_closing_bond_direction_mismatch =
            ignore_closing_bond_direction_mismatch;
   r_loader.inside_rsmiles = true;
   r_loader.reaction_atom_mapping = &rcnt_aam;

   if (_rxn != 0)
   {
      rcnt.reset(new Molecule());
      r_loader.loadMolecule((Molecule &)rcnt.ref());
   }
   else
   {
      rcnt.reset(new QueryMolecule());
      r_loader.loadQueryMolecule((QueryMolecule &)rcnt.ref());
   }
   
   // read the catalysts (agents)
   buf.clear();
   while (1)
   {
      char c = _scanner.readChar();

      if (c == '>')
         break;
      buf.push(c);
   }

   if (_rxn != 0)
      ctlt.reset(new Molecule());
   else
      ctlt.reset(new QueryMolecule());

   BufferScanner c_scanner(buf);
   SmilesLoader c_loader(c_scanner);

   c_loader.ignore_closing_bond_direction_mismatch =
            ignore_closing_bond_direction_mismatch;
   c_loader.inside_rsmiles = true;
   c_loader.reaction_atom_mapping = &ctlt_aam;

   if (_rxn != 0)
   {
      ctlt.reset(new Molecule());
      c_loader.loadMolecule((Molecule &)ctlt.ref());
   }
   else
   {
      ctlt.reset(new QueryMolecule());
      c_loader.loadQueryMolecule((QueryMolecule &)ctlt.ref());
   }

   bool vbar = false;

   // read the products
   buf.clear();
   while (!_scanner.isEOF())
   {
      char c = _scanner.readChar();

      if (c == '|')
      {
         vbar = true;
         break;
      }
      buf.push(c);
   }

   BufferScanner p_scanner(buf);
   SmilesLoader p_loader(p_scanner);

   p_loader.ignore_closing_bond_direction_mismatch =
            ignore_closing_bond_direction_mismatch;
   p_loader.inside_rsmiles = true;
   p_loader.reaction_atom_mapping = &prod_aam;
   if (_rxn != 0)
   {
      prod.reset(new Molecule());
      p_loader.loadMolecule((Molecule &)prod.ref());
   }
   else
   {
      prod.reset(new QueryMolecule());
      p_loader.loadQueryMolecule((QueryMolecule &)prod.ref());
   }

   MoleculeDecomposer r_decomp(rcnt.ref());
   MoleculeDecomposer c_decomp(ctlt.ref());
   MoleculeDecomposer p_decomp(prod.ref());
   MoleculeDecomposer *decomp[] = {&r_decomp, &c_decomp, &p_decomp};

   int ncomp_r = r_decomp.decompose();
   int ncomp_c = c_decomp.decompose();
   int ncomp_p = p_decomp.decompose();

   QS_DEF(Array<int>, r_fragments);
   QS_DEF(Array<int>, c_fragments);
   QS_DEF(Array<int>, p_fragments);
   Array<int>* fragments[] = {&r_fragments, &c_fragments, &p_fragments};

   r_fragments.clear_resize(ncomp_r);
   c_fragments.clear_resize(ncomp_c);
   p_fragments.clear_resize(ncomp_p);

   for (i = 0; i < r_fragments.size(); i++)
      r_fragments[i] = i;

   for (i = 0; i < c_fragments.size(); i++)
      c_fragments[i] = i;

   for (i = 0; i < p_fragments.size(); i++)
      p_fragments[i] = i;

   bool have_highlighting = false;

   QS_DEF(Array<int>, hl_atoms);
   QS_DEF(Array<int>, hl_bonds);

   hl_atoms.clear_resize(rcnt->vertexCount() + ctlt->vertexCount() + prod->vertexCount());
   hl_bonds.clear_resize(rcnt->edgeCount() + ctlt->edgeCount() + prod->edgeCount());
   hl_atoms.zerofill();
   hl_bonds.zerofill();

   if (vbar)
   {
      MoleculeStereocenters &r_stereo = rcnt->stereocenters;
      MoleculeStereocenters &c_stereo = ctlt->stereocenters;
      MoleculeStereocenters &p_stereo = prod->stereocenters;
      MoleculeStereocenters *stereo[] = {&r_stereo, &c_stereo, &p_stereo};

      while (1)
      {
         char c = _scanner.readChar();

         if (c == '|')
            break;

         if (c == 'w')
         {
            if (_scanner.readChar() != ':')
               throw Error("colon expected after 'w'");

            while (isdigit(_scanner.lookNext()))
            {
               int idx = _scanner.readUnsigned();

               int group = _selectGroup(idx, rcnt->vertexCount(), ctlt->vertexCount(), prod->vertexCount());
               stereo[group]->add(idx, MoleculeStereocenters::ATOM_ANY, 0, false);

               if (_scanner.lookNext() == ',')
                  _scanner.skip(1);
            }
         }
         else if (c == 'a')
         {
            if (_scanner.readChar() != ':')
               throw Error("colon expected after 'a'");

            while (isdigit(_scanner.lookNext()))
            {
               int idx = _scanner.readUnsigned();

               int group = _selectGroup(idx, rcnt->vertexCount(), ctlt->vertexCount(), prod->vertexCount());
               stereo[group]->setType(idx, MoleculeStereocenters::ATOM_ABS, 0);

               if (_scanner.lookNext() == ',')
                  _scanner.skip(1);
            }
         }
         else if (c == 'o')
         {
            int groupno = _scanner.readUnsigned();

            if (_scanner.readChar() != ':')
               throw Error("colon expected after 'o'");

            while (isdigit(_scanner.lookNext()))
            {
               int idx = _scanner.readUnsigned();

               int group = _selectGroup(idx, rcnt->vertexCount(), ctlt->vertexCount(), prod->vertexCount());
               stereo[group]->setType(idx, MoleculeStereocenters::ATOM_OR, groupno);

               if (_scanner.lookNext() == ',')
                  _scanner.skip(1);
            }
         }
         else if (c == '&')
         {
            int groupno = _scanner.readUnsigned();

            if (_scanner.readChar() != ':')
               throw Error("colon expected after '&'");

            while (isdigit(_scanner.lookNext()))
            {
               int idx = _scanner.readUnsigned();

               int group = _selectGroup(idx, rcnt->vertexCount(), ctlt->vertexCount(), prod->vertexCount());
               stereo[group]->setType(idx, MoleculeStereocenters::ATOM_AND, groupno);

               if (_scanner.lookNext() == ',')
                  _scanner.skip(1);
            }
         }
         else if (c == '^')
         {
            int rad = _scanner.readIntFix(1);
            int radical;

            if (rad == 1)
               radical = RADICAL_DOUPLET;
            else if (rad == 3)
               radical = RADICAL_SINGLET;
            else if (rad == 4)
               radical = RADICAL_TRIPLET;
            else
               throw Error("unsupported radical number: %d", rad);

            if (_scanner.readChar() != ':')
               throw Error("colon expected after radical number");

            while (isdigit(_scanner.lookNext()))
            {
               int idx = _scanner.readUnsigned();

               int group = _selectGroup(idx, rcnt->vertexCount(), ctlt->vertexCount(), prod->vertexCount());

               if (_rxn != 0)
                  ((Molecule &)mols[group]->ref()).setAtomRadical(idx, radical);
               else
               {
                  QueryMolecule &qmol = (QueryMolecule &)mols[group]->ref();

                  qmol.resetAtom(idx, (QueryMolecule::Atom *)QueryMolecule::Atom::und(
                          qmol.releaseAtom(idx),
                          new QueryMolecule::Atom(QueryMolecule::ATOM_RADICAL, radical)));
               }

               if (_scanner.lookNext() == ',')
                  _scanner.skip(1);
            }
         }
         else if (c == 'f')
         {
            if (_scanner.readChar() != ':')
               throw Error("colon expected after 'f'");

            while (isdigit(_scanner.lookNext()))
            {
               int idx = _scanner.readUnsigned();

               while (_scanner.lookNext() == '.')
               {
                  _scanner.skip(1);

                  int idx1 = idx;
                  int index_in_group = _scanner.readUnsigned();
                  int group = _selectGroupByPair(idx1, index_in_group,
                     r_fragments.size(), c_fragments.size(), p_fragments.size());
                  (*fragments[group])[index_in_group] = idx1;
               }

               if (_scanner.lookNext() == ',')
                  _scanner.skip(1);
            }
         }
         else if (c == '$')
         {
            int k = rcnt->vertexCount() + ctlt->vertexCount() + prod->vertexCount();
            QS_DEF(Array<char>, label);

            for (i = 0; i < k; i++)
            {
               label.clear();

               while (1)
               {
                  if (_scanner.isEOF())
                     throw Error("end of input while reading $...$ block");
                  c = _scanner.readChar();
                  if (c == ';' || c == '$')
                     break;
                  label.push(c);
               }
               if (c == '$' && i != k - 1)
                  throw Error("only %d atoms found in pseudo-atoms $...$ block", i + 1);
               if (label.size() > 0)
               {
                  label.push(0);

                  int idx = i;
                  int group = _selectGroup(idx, rcnt->vertexCount(), ctlt->vertexCount(), prod->vertexCount());

                  if (_rxn != 0)
                     ((Molecule &)mols[group]->ref()).setPseudoAtom(idx, label.ptr());
                  else
                  {
                     QueryMolecule &qmol = (QueryMolecule &)mols[group]->ref();

                     qmol.resetAtom(idx, (QueryMolecule::Atom *)QueryMolecule::Atom::und(qmol.releaseAtom(idx),
                              new QueryMolecule::Atom(QueryMolecule::ATOM_PSEUDO, label.ptr())));

                  }
               }
            }
            
         }
         else if (c == 'h')
         {
            have_highlighting = true;

            c = _scanner.readChar();

            int a = false;

            if (c == 'a')
               a = true;
            else if (c != 'b')
               throw Error("expected 'a' or 'b' after 'h', got '%c'", c);

            if (_scanner.readChar() != ':')
               throw Error("colon expected after 'h%c'", a ? 'a' : 'b');

            while (isdigit(_scanner.lookNext()))
            {
               int idx = _scanner.readUnsigned();

               if (a)
                  hl_atoms[idx] = 1;
               else
                  hl_bonds[idx] = 1;

               if (_scanner.lookNext() == ',')
                  _scanner.skip(1);
            }
         }
      }
   }
   
   if (_rxn != 0)
   {
      r_loader.checkQueryAtoms();
      c_loader.checkQueryAtoms();
      p_loader.checkQueryAtoms();
   }

   AutoPtr<BaseMolecule> mol;
   QS_DEF(Array<int>, aam);
   QS_DEF(Array<int>, mapping);
   QS_DEF(Array<int>, hl_atoms_frag);
   QS_DEF(Array<int>, hl_bonds_frag);

   if (highlighting != 0)
      highlighting->init(*_brxn);

   if (_rxn != 0)
      mol.reset(new Molecule());
   else
      mol.reset(new QueryMolecule());

   for (int v = 0; v < 3; ++v)
   {
      for (i = 0; i < fragments[v]->size(); i++)
      {
         int j, k;

         if ((*fragments[v])[i] == -1)
            continue;

         mol->clear();
         aam.clear();
         hl_atoms_frag.clear();
         hl_bonds_frag.clear();

         for (j = i; j < fragments[v]->size(); j++)
         {
            AutoPtr<BaseMolecule> fragment;

            if (_rxn != 0)
               fragment.reset(new Molecule());
            else
               fragment.reset(new QueryMolecule());

            if ((*fragments[v])[j] == i)
            {
               (*fragments[v])[j] = -1;
               decomp[v]->buildComponentMolecule(j, fragment.ref(), &mapping, 0);

               mol->mergeWithMolecule(fragment.ref(), 0);

               for (k = 0; k < fragment->vertexCount(); k++)
               {
                  aam.push((*aams[v])[mapping[k]]);
                  
                  int idx = mapping[k];

                  for (int w = 0; w < v; w++)
                     idx += mols[w]->ref().vertexCount();

                  hl_atoms_frag.push(hl_atoms[idx]);
               }

               for (k = 0; k < fragment->edgeCount(); k++)
               {
                  const Edge &edge = fragment->getEdge(k);

                  int idx = mols[v]->ref().findEdgeIndex(mapping[edge.beg], mapping[edge.end]);

                  if (idx < 0)
                     throw Error("internal: can not find edge");

                  for (int w = 0; w < v; w++)
                     idx += mols[w]->ref().edgeCount();

                  hl_bonds_frag.push(hl_bonds[idx]);
               }
            }
         }

         int idx;
         if (v == 0)
            idx = _brxn->addReactantCopy(mol.ref(), 0, 0);
         else if (v == 1)
            idx = _brxn->addCatalystCopy(mol.ref(), 0, 0);
         else if (v == 2)
            idx = _brxn->addProductCopy(mol.ref(), 0, 0);

         _brxn->getAAMArray(idx).copy(aam);

         if (have_highlighting && highlighting != 0)
         {
            highlighting->nondestructiveInit(*_brxn);
            highlighting->getGraphHighlighting(idx).init(_brxn->getBaseMolecule(idx));

            Filter vfilter(hl_atoms_frag.ptr(), Filter::NEQ, 0);
            Filter efilter(hl_bonds_frag.ptr(), Filter::NEQ, 0);

            highlighting->getGraphHighlighting(idx).onVertices(vfilter);
            highlighting->getGraphHighlighting(idx).onEdges(efilter);
         }
      }
   }
}
