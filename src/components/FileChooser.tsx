import React from 'react'
import axios from 'axios'
import { Link, RouteComponentProps } from 'react-router-dom'
import {
  Breadcrumb,
  Button,
  Dimmer,
  List,
  Loader,
  Table,
} from 'semantic-ui-react'
import moment from 'moment'
import { showError } from '../utils/Helpers'
import config from '../config'

export interface IAnnotation {
  id: number
  created_at: string
}

export interface IFile {
  bucket_path: string
  id: number
  job_id: number
  signed_url: string
  status: string
  annotations: IAnnotation[]
}

interface IFileChooserProps {
  jobId: string
}

const filesUrl = `${config.API_URL}${config.FILES}`

interface IAnnotaitonListProps {
  file: IFile
  jobId: string
}

const AnnotationList = ({ jobId, file }: IAnnotaitonListProps) => {
  const [showAll, setShowAll] = React.useState(false)

  const shownAnnotations = showAll
    ? file.annotations
    : file.annotations.slice(
        Math.max(file.annotations.length - 4, 0),
        file.annotations.length,
      )

  return (
    <React.Fragment>
      {file.annotations.length !== shownAnnotations.length && !showAll && (
        <Button
          onClick={() => {
            setShowAll(true)
          }}
          size={'tiny'}
        >
          Older...
        </Button>
      )}
      <List>
        {shownAnnotations.map((annotation: IAnnotation, index: number) => {
          return (
            <List.Item key={annotation.id}>
              <Link to={`/jobs/${jobId}/edit/${annotation.id}`}>
                V{index + 1 + file.annotations.length - shownAnnotations.length}{' '}
                ({moment(annotation.created_at).format('DD.MM.Y HH:mm:ss')})
              </Link>
              <AnnotationPreviewButton annotation={annotation} />
            </List.Item>
          )
        })}
      </List>
    </React.Fragment>
  )
}

interface IAnnotationPreviewButtonProps {
  annotation: IAnnotation
}

const AnnotationPreviewButton = ({
  annotation,
}: IAnnotationPreviewButtonProps) => {
  const [showing, setShowing] = React.useState(false)
  const [imgLoaded, setImgLoaded] = React.useState(false)
  if (!showing) {
    return (
      <Button
        size={'mini'}
        onClick={() => {
          setShowing(true)
        }}
      >
        Preview
      </Button>
    )
  }
  const url = `${config.API_URL}${config.FILE_ANNOTATION}/preview/${annotation.id}.png`
  return (
    <React.Fragment>
      <img
        src={url}
        className={'annotation-preview'}
        onLoad={() => {
          setImgLoaded(true)
        }}
      />
      {!imgLoaded && <Loader inline active />}
    </React.Fragment>
  )
}

interface IStatusButtonProps {
  file: IFile
  updateFile: (updatedFile: IFile) => void
}

const StatusButton = ({ file, updateFile }: IStatusButtonProps) => {
  const isDone = file.status === 'done'
  const [loading, setLoading] = React.useState<boolean>(false)

  return (
    <React.Fragment>
      {file.annotations.length > 0 && (
        <Button
          color={isDone ? 'green' : 'red'}
          size={'mini'}
          disabled={loading}
          onClick={async () => {
            console.log('asdf onClick called')
            setLoading(true)
            try {
              const url = `${config.API_URL}${config.FILES}/${file.id}`
              const returnData = await axios.put(url, {
                status: file.status === 'done' ? 'not-done' : 'done',
              })
              updateFile(returnData.data)
            } catch (e) {
              showError()
            } finally {
              setLoading(false)
            }
          }}
          loading={loading}
        >
          {isDone ? 'Done' : 'Not Done'}
        </Button>
      )}
    </React.Fragment>
  )
}

const FileChooser = ({ match }: RouteComponentProps<IFileChooserProps>) => {
  const { jobId } = match.params

  const [filters, setFilters] = React.useState<string>('0')
  const [files, setFiles] = React.useState<IFile[]>([])
  const [loading, setLoading] = React.useState<boolean>(true)
  const filesRef = React.useRef<IFile[]>([])

  const getFileInfo = async (newFilters: string) => {
    setLoading(true)
    setFilters(newFilters)
    try {
      const response = await axios.get(filesUrl, {
        params: {
          annotated: newFilters,
          job_id: jobId,
        },
      })
      setFiles(response.data)
      filesRef.current = response.data
      setLoading(false)
    } catch (e) {
      showError()
    }
  }

  const updateFile = (updatedFile: IFile) => {
    const newFiles = filesRef.current.map(file => {
      return file.id === updatedFile.id ? updatedFile : file
    })
    setFiles(newFiles)
    filesRef.current = newFiles
  }

  React.useEffect(() => {
    getFileInfo('0')
  }, [jobId])

  return (
    <React.Fragment>
      <Breadcrumb size={'large'}>
        <Breadcrumb.Section link as={Link} to={'/'}>
          Jobs
        </Breadcrumb.Section>
        <Breadcrumb.Divider icon={'right angle'} />
        <Breadcrumb.Section active>Files</Breadcrumb.Section>
      </Breadcrumb>
      <div className="ui attached tabular menu">
        <a
          className={'item' + (filters === '0' ? ' active' : '')}
          onClick={() => {
            getFileInfo('0')
          }}
        >
          Non annotated
        </a>
        <a
          className={'item' + (filters === '1' ? ' active' : '')}
          onClick={() => {
            getFileInfo('1')
          }}
        >
          Annotated
        </a>
        <a
          className={'item' + (filters === '' ? ' active' : '')}
          onClick={() => {
            getFileInfo('')
          }}
        >
          All
        </a>
      </div>
      {loading ? (
        <div className={'my-segment'}>
          <Dimmer active inverted>
            <Loader>Loading..</Loader>
          </Dimmer>
        </div>
      ) : files.length === 0 ? (
        <p>Nothing here</p>
      ) : (
        <Table celled>
          <Table.Header>
            <Table.Row>
              <Table.HeaderCell>Bucket path</Table.HeaderCell>
              <Table.HeaderCell>Annotations</Table.HeaderCell>
              <Table.HeaderCell>Ready</Table.HeaderCell>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {files.map((file: IFile) => {
              return (
                <Table.Row key={file.id}>
                  <Table.Cell>
                    <Link to={`/jobs/${jobId}/annotate/${file.id}`}>
                      {file.bucket_path}
                    </Link>
                  </Table.Cell>
                  <Table.Cell>
                    <AnnotationList file={file} jobId={jobId} />
                  </Table.Cell>
                  <Table.Cell>
                    <StatusButton file={file} updateFile={updateFile} />
                  </Table.Cell>
                </Table.Row>
              )
            })}
          </Table.Body>
          <Table.Footer>
            <Table.Row>
              <Table.HeaderCell colSpan="3">Footer</Table.HeaderCell>
            </Table.Row>
          </Table.Footer>
        </Table>
      )}
    </React.Fragment>
  )
}

export default FileChooser
