void TextureTriplanarInitialize( inout FragmentState s )
{
    s.triplanarPosition = s.vertexPosition;
    s.triplanarNormal = s.vertexNormal;
}

#define TextureInitialize   TextureTriplanarInitialize
