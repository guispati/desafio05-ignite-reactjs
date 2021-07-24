import { GetStaticPaths, GetStaticProps } from 'next';

import { getPrismicClient } from '../../services/prismic';
import Prismic from '@prismicio/client';

import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

import commonStyles from '../../styles/common.module.scss';
import styles from './post.module.scss';
import Head from 'next/head';
import { FiCalendar, FiClock, FiUser } from 'react-icons/fi';
import { useRouter } from 'next/router';
import { RichText } from 'prismic-dom';
import { Fragment } from 'react';

interface Post {
  first_publication_date: string | null;
  data: {
    title: string;
    banner: {
      url: string;
    };
    author: string;
    content: {
      heading: string;
      body: {
        text: string;
      }[];
    }[];
  };
}

interface PostProps {
  post: Post;
}

export default function Post({post}: PostProps) {
    const router = useRouter()

    if (router.isFallback) {
        return <div>Carregando...</div>
    }

    const mediaPalavras = 200;

    const totalPalavras = post.data.content.reduce((c, content) => {
        c += content.heading.split(/\S+/g).length;
        c += RichText.asText(content.body).split(/\S+/g).length;

        return c;
    }, 0)

    const tempoLeitura = Math.ceil(totalPalavras/mediaPalavras);
    
    return (
        <>
            <Head>
                <title>{post.data.title} | spacetravelling</title>
            </Head>

            <img className={styles.banner} src={ post.data.banner.url} />
            <main className={styles.container}>
                <article className={styles.post}>
                    <h1 className={styles.postTitle}>{post.data.title}</h1>
                    <div className={styles.info}>
                        <span>
                            <FiCalendar />
                            {format(
                                new Date(post.first_publication_date),
                                "dd MMM yyyy",
                                {
                                    locale: ptBR,
                                }
                            )}
                        </span>
                        <span> <FiUser /> {post.data.author} </span>
                        <span> <FiClock /> {tempoLeitura} min </span>
                    </div>
                    <div className={styles.content}>
                        {post.data.content.map((content, key) => (
                            <Fragment key={key}>
                                <div className={styles.heading}>
                                    {content.heading}
                                </div>
                                <div
                                    className={styles.body}
                                    dangerouslySetInnerHTML={{ __html: RichText.asHtml(content.body) }}
                                >
                                </div>
                            </Fragment>
                        ))}
                    </div>
                </article>
            </main>
        </>
    )
}

export const getStaticPaths: GetStaticPaths = async () => {
    const prismic = getPrismicClient();

    const posts = await prismic.query([
        Prismic.predicates.at('document.type', 'post')
    ], {
        fetch: [
            'post.title',
            'post.banner',
            'post.author',
            'post.content'
        ]
    });

    const paths = posts.results.map(path => ({
        params: {
            slug: path.uid,
        }
    }))

    return {
        paths,
        fallback: true
    }
};

export const getStaticProps: GetStaticProps = async ({ params }) => {
    const { slug } = params;
    const prismic = getPrismicClient();
    const response = await prismic.getByUID('post', String(slug), {});

    const post = {
        first_publication_date: response.first_publication_date,
        data: {
            title: response.data.title,
            banner: {
                url: response.data.banner.url,
            },
            author: response.data.author,
            content: response.data.content,
            subtitle: response.data.subtitle,
        },
        uid: response.uid,
    };

    return {
        props: {
            post
        },
        revalidate: 60 * 60 //1 hora
    }
};
